import { isAudioContentType, resolveAttachmentContentType } from "../domain/attachment-content-type";
import {
  buildTranscriptionSegment,
  countTranscriptionSegments,
  detectAudioContainer,
  UnsupportedAudioError,
} from "../domain/audio/audio-segments";
import type { TranscriptionErrorCode } from "./transcription-errors";
import { getReflectionState } from "@/modules/reflection/application/reflection-service";
import { AiConfigurationError, isAiConfigured, listGroqProviderSlots, transcribeAudio, TranscriptionRateLimitError } from "@/shared/lib/ai-providers";
import {
  beginAttachmentTranscription,
  createAttachmentByteReader,
  getAttachmentById,
  getAttachmentFileLength,
  getAttachmentTranscriptionState,
  saveTranscriptionSegment,
  type TranscriptionJobState,
} from "@/shared/lib/mongodb/attachments";

export type TranscriptionResult =
  | { ok: true; data: TranscriptionJobState }
  | { ok: false; code: TranscriptionErrorCode; status: number; retryAfterSeconds?: number };

/** Dependencies, swappable in tests. */
export type TranscriptionDeps = {
  getAttachment: typeof getAttachmentById;
  getFileLength: typeof getAttachmentFileLength;
  createReader: typeof createAttachmentByteReader;
  begin: typeof beginAttachmentTranscription;
  getState: typeof getAttachmentTranscriptionState;
  saveSegment: typeof saveTranscriptionSegment;
  isConsented: (userId: string) => Promise<boolean>;
  isConfigured: () => boolean;
  transcribe: typeof transcribeAudio;
};

const defaultDeps: TranscriptionDeps = {
  getAttachment: getAttachmentById,
  getFileLength: getAttachmentFileLength,
  createReader: createAttachmentByteReader,
  begin: beginAttachmentTranscription,
  getState: getAttachmentTranscriptionState,
  saveSegment: saveTranscriptionSegment,
  isConsented: async (userId) => (await getReflectionState(userId)).consented,
  isConfigured: () => isAiConfigured() && listGroqProviderSlots().length > 0,
  transcribe: transcribeAudio,
};

function fail(code: TranscriptionErrorCode, status: number, retryAfterSeconds?: number): TranscriptionResult {
  return retryAfterSeconds === undefined ? { ok: false, code, status } : { ok: false, code, status, retryAfterSeconds };
}

type LoadedAudio =
  | { failure: TranscriptionResult }
  | { failure: null; attachment: NonNullable<Awaited<ReturnType<typeof getAttachmentById>>>; length: number; read: ReturnType<typeof createAttachmentByteReader> };

async function loadAudio(userId: string, attachmentId: string, deps: TranscriptionDeps): Promise<LoadedAudio> {
  const attachment = await deps.getAttachment(userId, attachmentId);
  if (!attachment) return { failure: fail("not_found", 404) };
  const contentType = resolveAttachmentContentType(attachment.fileName, attachment.mimeType);
  if (!contentType || !isAudioContentType(contentType)) return { failure: fail("not_audio", 400) };
  if (!(await deps.isConsented(userId))) return { failure: fail("consent_required", 403) };
  if (!deps.isConfigured()) return { failure: fail("not_configured", 503) };
  const length = await deps.getFileLength(attachment.gridFsId);
  if (!length) return { failure: fail("not_found", 404) };
  return { failure: null, attachment, length, read: deps.createReader(attachment.gridFsId, length) };
}

/** Starts or resumes transcribing a saved audio attachment. */
export async function startAttachmentTranscription(
  userId: string,
  attachmentId: string,
  options: { restart?: boolean } = {},
  deps: TranscriptionDeps = defaultDeps,
): Promise<TranscriptionResult> {
  const loaded = await loadAudio(userId, attachmentId, deps);
  if (loaded.failure) return loaded.failure;
  const head = await loaded.read(0, 64 * 1024);
  if (!detectAudioContainer(head)) return fail("unsupported_audio", 422);

  const state = await deps.begin(userId, attachmentId, countTranscriptionSegments(loaded.length), options);
  return state ? { ok: true, data: state } : fail("not_found", 404);
}

/** Transcribes one segment. Idempotent: an already finished segment is not sent again. */
export async function transcribeAttachmentSegment(
  userId: string,
  attachmentId: string,
  indexParam: string,
  deps: TranscriptionDeps = defaultDeps,
): Promise<TranscriptionResult> {
  if (!/^\d+$/.test(indexParam)) return fail("bad_segment", 400);
  const index = Number(indexParam);
  const loaded = await loadAudio(userId, attachmentId, deps);
  if (loaded.failure) return loaded.failure;

  const state = await deps.getState(userId, attachmentId);
  if (!state || index >= state.total) return fail("bad_segment", 409);
  if (!state.pendingSegments.includes(index)) return { ok: true, data: state };

  try {
    const segment = await buildTranscriptionSegment(loaded.read, loaded.length, index);
    const text = segment
      ? await deps.transcribe(segment.bytes, `segment-${index + 1}.${segment.extension}`, segment.mimeType, { allowEmpty: true, timeoutMs: 45_000 })
      : "";
    const saved = await deps.saveSegment(userId, attachmentId, index, text);
    return saved ? { ok: true, data: saved } : fail("bad_segment", 409);
  } catch (error) {
    if (error instanceof TranscriptionRateLimitError) return fail("rate_limited", 429, error.retryAfterSeconds);
    if (error instanceof UnsupportedAudioError) return fail("unsupported_audio", 422);
    if (error instanceof AiConfigurationError) return fail("not_configured", 503);
    console.error("[transcription] segment failed", { attachmentId, index, error: error instanceof Error ? error.message : error });
    return fail("provider_error", 502);
  }
}
