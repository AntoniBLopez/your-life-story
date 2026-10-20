import type { ActionResult } from "@/shared/types/action";
import { isAttachmentUploadErrorCode, type AttachmentUploadErrorCode } from "@/modules/life-story/application/attachment-upload-errors";
import { maxAttachmentBytes } from "@/modules/life-story/domain/attachment-upload";
import type { VoiceFieldKey } from "@/modules/life-story/domain/voice-note";

const UPLOADS_ENDPOINT = "/api/attachments/uploads";
const PART_ATTEMPTS = 3;

type Locale = "es" | "en";
type FailureKind = AttachmentUploadErrorCode | "network";

export type UploadAttachmentInput = {
  entryId: string;
  file: Blob;
  fileName: string;
  contentType: string;
  fieldKey?: VoiceFieldKey;
  transcript?: string;
  locale: Locale;
  /** Called with 0…1 as parts are stored. */
  onProgress?: (fraction: number) => void;
  /** Injected in tests. */
  fetchImpl?: typeof fetch;
};

function formatMegabytes(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, "");
}

export function uploadErrorMessage(kind: FailureKind, fileName: string, sizeBytes: number, locale: Locale, contentType = "") {
  const maxMb = formatMegabytes(maxAttachmentBytes(contentType));
  if (locale === "en") {
    switch (kind) {
      case "too_large": return `“${fileName}” is ${formatMegabytes(sizeBytes)} MB; the maximum is ${maxMb} MB.`;
      case "invalid_file": return `Could not attach “${fileName}”: use JPG, PNG, WEBP, PDF or audio up to ${maxMb} MB.`;
      case "unauthorized": return "Your session has expired. Sign in again and retry.";
      case "entry_not_found": return "You don't have access to this experience.";
      case "network": return `Could not upload “${fileName}”: check your connection and try again.`;
      default: return `Could not upload “${fileName}”. Please try again.`;
    }
  }
  switch (kind) {
    case "too_large": return `«${fileName}» pesa ${formatMegabytes(sizeBytes).replace(".", ",")} MB y el máximo es ${maxMb} MB.`;
    case "invalid_file": return `No se pudo adjuntar «${fileName}»: usa JPG, PNG, WEBP, PDF o audio de hasta ${maxMb} MB.`;
    case "unauthorized": return "Tu sesión ha caducado. Vuelve a iniciar sesión e inténtalo de nuevo.";
    case "entry_not_found": return "No tienes acceso a esta experiencia.";
    case "network": return `No se pudo subir «${fileName}»: revisa tu conexión e inténtalo de nuevo.`;
    default: return `No se pudo subir «${fileName}». Inténtalo de nuevo.`;
  }
}

class UploadFailure extends Error {
  constructor(readonly kind: FailureKind) {
    super(kind);
  }
}

async function callJson<T>(fetchImpl: typeof fetch, url: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetchImpl(url, { credentials: "same-origin", ...init });
  } catch {
    throw new UploadFailure("network");
  }
  const body = await response.json().catch(() => null) as { code?: unknown } | null;
  if (!response.ok) {
    if (response.status === 413) throw new UploadFailure("too_large");
    throw new UploadFailure(isAttachmentUploadErrorCode(body?.code) ? body.code : "server_error");
  }
  return body as T;
}

function isRetryable(error: unknown) {
  return error instanceof UploadFailure && (error.kind === "network" || error.kind === "server_error");
}

/**
 * Uploads an attachment in ~3 MB parts so it never hits the Server Action (1 MB)
 * or Vercel function (4.5 MB) body limits. Never throws: failures come back as
 * a user-facing message in the requested locale.
 */
export async function uploadAttachment(input: UploadAttachmentInput): Promise<ActionResult<{ id: string }>> {
  input.onProgress?.(0);
  const fetchImpl = input.fetchImpl ?? fetch;
  const fail = (kind: FailureKind) => ({ ok: false as const, error: uploadErrorMessage(kind, input.fileName, input.file.size, input.locale, input.contentType) });

  if (input.file.size <= 0) return fail("invalid_file");
  if (input.file.size > maxAttachmentBytes(input.contentType)) return fail("too_large");

  let uploadId: string | undefined;
  try {
    const started = await callJson<{ uploadId: string; partSize: number; totalParts: number }>(fetchImpl, UPLOADS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entryId: input.entryId,
        fileName: input.fileName,
        contentType: input.contentType,
        size: input.file.size,
        fieldKey: input.fieldKey,
        transcript: input.transcript,
      }),
    });
    uploadId = started.uploadId;

    for (let index = 0; index < started.totalParts; index += 1) {
      const start = index * started.partSize;
      const part = input.file.slice(start, Math.min(start + started.partSize, input.file.size));
      for (let attempt = 1; ; attempt += 1) {
        try {
          await callJson(fetchImpl, `${UPLOADS_ENDPOINT}/${uploadId}/parts/${index}`, {
            method: "PUT",
            headers: { "Content-Type": "application/octet-stream" },
            body: part,
          });
          input.onProgress?.((index + 1) / started.totalParts);
          break;
        } catch (error) {
          if (attempt >= PART_ATTEMPTS || !isRetryable(error)) throw error;
        }
      }
    }

    const completed = await callJson<{ id: string }>(fetchImpl, `${UPLOADS_ENDPOINT}/${uploadId}/complete`, { method: "POST" });
    return { ok: true, data: { id: completed.id } };
  } catch (error) {
    if (uploadId) {
      await fetchImpl(`${UPLOADS_ENDPOINT}/${uploadId}`, { method: "DELETE", credentials: "same-origin" }).catch(() => undefined);
    }
    return fail(error instanceof UploadFailure ? error.kind : "server_error");
  }
}
