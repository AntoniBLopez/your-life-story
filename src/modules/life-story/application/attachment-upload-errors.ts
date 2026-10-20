/** Error codes returned by the /api/attachments/uploads endpoints. */
export const ATTACHMENT_UPLOAD_ERROR_CODES = [
  "unauthorized",
  "invalid_file",
  "too_large",
  "entry_not_found",
  "upload_not_found",
  "bad_part",
  "incomplete",
  "server_error",
] as const;

export type AttachmentUploadErrorCode = (typeof ATTACHMENT_UPLOAD_ERROR_CODES)[number];

export function isAttachmentUploadErrorCode(value: unknown): value is AttachmentUploadErrorCode {
  return typeof value === "string" && (ATTACHMENT_UPLOAD_ERROR_CODES as readonly string[]).includes(value);
}
