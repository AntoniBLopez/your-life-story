/** Error codes returned by /api/attachments/:id/transcription endpoints. */
export const TRANSCRIPTION_ERROR_CODES = [
  "unauthorized",
  "not_found",
  "not_audio",
  "consent_required",
  "not_configured",
  "unsupported_audio",
  "rate_limited",
  "provider_error",
  "bad_segment",
  "server_error",
] as const;

export type TranscriptionErrorCode = (typeof TRANSCRIPTION_ERROR_CODES)[number];

export function isTranscriptionErrorCode(value: unknown): value is TranscriptionErrorCode {
  return typeof value === "string" && (TRANSCRIPTION_ERROR_CODES as readonly string[]).includes(value);
}
