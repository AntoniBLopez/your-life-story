import { AUDIO_CONTENT_TYPES, type AudioContentType } from "./voice-note";

export const IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const DOCUMENT_CONTENT_TYPES = ["application/pdf"] as const;
export const ATTACHMENT_CONTENT_TYPES = [
  ...IMAGE_CONTENT_TYPES,
  ...DOCUMENT_CONTENT_TYPES,
  ...AUDIO_CONTENT_TYPES,
] as const;

export type AttachmentContentType = (typeof ATTACHMENT_CONTENT_TYPES)[number];

const EXTENSION_MAP: Record<string, AttachmentContentType> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  webm: "audio/webm",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
};

const MIME_ALIASES: Record<string, AttachmentContentType> = {
  "application/x-pdf": "application/pdf",
  "image/jpg": "image/jpeg",
  "audio/x-m4a": "audio/x-m4a",
  "audio/mp4": "audio/mp4",
};

export function resolveAttachmentContentType(fileName: string, reportedType = ""): AttachmentContentType | null {
  const normalized = reportedType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (ATTACHMENT_CONTENT_TYPES.includes(normalized as AttachmentContentType)) {
    return normalized as AttachmentContentType;
  }
  if (normalized in MIME_ALIASES) return MIME_ALIASES[normalized]!;

  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_MAP[extension] ?? null;
}

export function isAudioContentType(contentType: AttachmentContentType): contentType is AudioContentType {
  return AUDIO_CONTENT_TYPES.includes(contentType as AudioContentType);
}
