import {
  audioContentTypeForTranscription,
  blobToBase64,
  DIRECT_TRANSCRIBE_MAX_BYTES,
  type AudioContentType,
  type PendingVoiceNote,
  type VoiceFieldKey,
} from "@/modules/life-story/domain/voice-note";
import { deleteRecordingBackup } from "@/modules/life-story/presentation/recording-backup";
import { transcribeSavedAudio, type TranscriptionProgressEvent } from "@/modules/life-story/presentation/transcribe-saved-audio";
import { uploadAttachment } from "@/modules/life-story/presentation/upload-attachment";

type Locale = "es" | "en";

export type VoiceStage =
  | { kind: "saving"; fraction: number }
  | { kind: "transcribing"; done: number; total: number }
  | { kind: "waiting"; done: number; total: number; resumeAt: Date };

export type VoicePipelineResult = {
  /** Where the audio ended up. "failed" = not stored on the server (the browser backup is kept). */
  saved: "uploaded" | "pending" | "not_stored" | "failed";
  attachmentId?: string;
  transcript: string;
  /** Non-fatal problem (e.g. transcription failed, audio kept). */
  warning?: string;
  /** The audio could not be stored. */
  error?: string;
};

export type VoicePipelineInput = {
  entryId?: string;
  blob: Blob;
  fileName: string;
  contentType: AudioContentType;
  fieldKey: VoiceFieldKey;
  locale: Locale;
  saveVoiceRecordings: boolean;
  backupId?: string | null;
  onStage?: (stage: VoiceStage) => void;
  onPendingVoiceNote?: (note: PendingVoiceNote) => void;
  deps?: Partial<VoicePipelineDeps>;
};

export type VoicePipelineDeps = {
  upload: typeof uploadAttachment;
  transcribeSaved: typeof transcribeSavedAudio;
  transcribeDirect: (blob: Blob, fileName: string, contentType: AudioContentType, locale: Locale) => Promise<{ ok: true; transcript: string } | { ok: false; error?: string }>;
  deleteAttachment: (attachmentId: string, entryId: string, locale: Locale) => Promise<unknown>;
  deleteBackup: typeof deleteRecordingBackup;
  toBase64: typeof blobToBase64;
};

async function defaultTranscribeDirect(blob: Blob, fileName: string, contentType: AudioContentType, locale: Locale) {
  try {
    const response = await fetch("/api/ai/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioBase64: await blobToBase64(blob), fileName, mimeType: audioContentTypeForTranscription(contentType), locale }),
    });
    const data = await response.json().catch(() => ({})) as { transcript?: string; error?: string };
    if (!response.ok) return { ok: false as const, error: data.error };
    return { ok: true as const, transcript: data.transcript?.trim() ?? "" };
  } catch {
    return { ok: false as const };
  }
}

const defaultDeps: VoicePipelineDeps = {
  upload: uploadAttachment,
  transcribeSaved: transcribeSavedAudio,
  transcribeDirect: defaultTranscribeDirect,
  deleteAttachment: async (attachmentId, entryId, locale) => {
    const { deleteAttachmentAction } = await import("@/modules/life-story/application/life-entry-actions");
    return deleteAttachmentAction(attachmentId, entryId, locale);
  },
  deleteBackup: deleteRecordingBackup,
  toBase64: blobToBase64,
};

function messages(locale: Locale) {
  return locale === "es"
    ? {
        transcribeFailedKept: "No se pudo transcribir, pero tu audio está guardado en la experiencia. Puedes transcribirlo luego con «Transcribir».",
        transcribeFailed: "No se pudo transcribir el audio.",
        longPending: "Audio largo guardado como pendiente: al guardar la experiencia lo subiremos y lo transcribiremos por partes.",
        keptAfterFailure: "Guardamos el audio en la experiencia para no perderlo; puedes borrarlo cuando quieras.",
        notSaved: "No se pudo guardar el audio. Sigue a salvo en este navegador: usa «Recuperar» en «Grabaciones sin guardar» para reintentarlo.",
      }
    : {
        transcribeFailedKept: "Transcription failed, but your audio is saved in the experience. You can transcribe it later with “Transcribe”.",
        transcribeFailed: "Could not transcribe the audio.",
        longPending: "Long audio kept as pending: when you save the experience we'll upload it and transcribe it in parts.",
        keptAfterFailure: "We kept the audio in the experience so it isn't lost; you can delete it anytime.",
        notSaved: "Could not save the audio. It's still safe in this browser: use “Recover” under “Unsaved recordings” to retry.",
      };
}

/**
 * What happens to a finished recording or chosen audio file. Rule: the audio is stored
 * before it is transcribed, and a failed transcription never discards it.
 */
export async function processVoiceCapture(input: VoicePipelineInput): Promise<VoicePipelineResult> {
  const deps = { ...defaultDeps, ...input.deps };
  const t = messages(input.locale);
  const short = input.blob.size <= DIRECT_TRANSCRIBE_MAX_BYTES;

  if (!input.entryId) {
    let transcript = "";
    let warning: string | undefined;
    if (short) {
      const direct = await deps.transcribeDirect(input.blob, input.fileName, input.contentType, input.locale);
      if (direct.ok) transcript = direct.transcript;
      else warning = direct.error ?? (input.saveVoiceRecordings ? t.transcribeFailedKept : t.transcribeFailed);
      if (!input.saveVoiceRecordings && direct.ok) {
        await deps.deleteBackup(input.backupId);
        return { saved: "not_stored", transcript, warning };
      }
    }
    input.onPendingVoiceNote?.({
      fieldKey: input.fieldKey,
      fileName: input.fileName,
      contentType: input.contentType,
      size: input.blob.size,
      fileBase64: short ? await deps.toBase64(input.blob) : "",
      blob: short ? undefined : input.blob,
      transcript,
      backupId: input.backupId ?? null,
      needsTranscription: !short || !transcript,
      deleteAfterTranscription: !input.saveVoiceRecordings,
    });
    return { saved: "pending", transcript, warning: warning ?? (short ? undefined : t.longPending) };
  }

  if (short && !input.saveVoiceRecordings) {
    const direct = await deps.transcribeDirect(input.blob, input.fileName, input.contentType, input.locale);
    if (direct.ok) {
      await deps.deleteBackup(input.backupId);
      return { saved: "not_stored", transcript: direct.transcript };
    }
    // Fall through: store it so the recording isn't lost.
  }

  const uploaded = await deps.upload({
    entryId: input.entryId,
    file: input.blob,
    fileName: input.fileName,
    contentType: input.contentType,
    fieldKey: input.fieldKey,
    locale: input.locale,
    onProgress: (fraction) => input.onStage?.({ kind: "saving", fraction }),
  });
  if (!uploaded.ok) return { saved: "failed", transcript: "", error: `${uploaded.error} ${t.notSaved}` };
  await deps.deleteBackup(input.backupId);
  const attachmentId = uploaded.data.id;

  const result = await deps.transcribeSaved({
    attachmentId,
    locale: input.locale,
    onProgress: (event: TranscriptionProgressEvent) => input.onStage?.(event.phase === "waiting"
      ? { kind: "waiting", done: event.done, total: event.total, resumeAt: event.resumeAt }
      : { kind: "transcribing", done: event.done, total: event.total }),
  });
  if (!result.ok) {
    const kept = input.saveVoiceRecordings ? "" : ` ${t.keptAfterFailure}`;
    return { saved: "uploaded", attachmentId, transcript: "", warning: `${result.error}${kept}` };
  }
  if (!input.saveVoiceRecordings) {
    await deps.deleteAttachment(attachmentId, input.entryId, input.locale);
    return { saved: "not_stored", transcript: result.transcript };
  }
  return { saved: "uploaded", attachmentId, transcript: result.transcript };
}

export function voiceStageLabel(stage: VoiceStage | null, locale: Locale) {
  if (!stage) return null;
  if (locale === "es") {
    if (stage.kind === "saving") return `Guardando tu voz… ${Math.round(stage.fraction * 100)} %`;
    if (stage.kind === "waiting") return `Límite del servicio alcanzado; seguimos a las ${stage.resumeAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })} (${stage.done} de ${stage.total} partes).`;
    return stage.total > 1 ? `Transcribiendo… parte ${Math.min(stage.done + 1, stage.total)} de ${stage.total}` : "Transcribiendo…";
  }
  if (stage.kind === "saving") return `Saving your voice… ${Math.round(stage.fraction * 100)}%`;
  if (stage.kind === "waiting") return `Provider limit reached; resuming at ${stage.resumeAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} (${stage.done} of ${stage.total} parts).`;
  return stage.total > 1 ? `Transcribing… part ${Math.min(stage.done + 1, stage.total)} of ${stage.total}` : "Transcribing…";
}
