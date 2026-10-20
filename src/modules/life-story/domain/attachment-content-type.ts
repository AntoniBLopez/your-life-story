import {
  AUDIO_CONTENT_TYPES,
  MAX_DICTATION_AUDIO_BYTES,
  mimeTypeToExtension,
  type AudioContentType,
} from "./voice-note";

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
  "audio/m4a": "audio/x-m4a",
  "audio/mp3": "audio/mpeg",
  "audio/mpeg3": "audio/mpeg",
  "audio/x-mpeg": "audio/mpeg",
  "audio/x-mp3": "audio/mpeg",
  "audio/x-wav": "audio/wav",
  "audio/wave": "audio/wav",
  "audio/x-pn-wav": "audio/wav",
  "audio/vnd.wave": "audio/wav",
  "audio/oga": "audio/ogg",
  "audio/vorbis": "audio/ogg",
  "audio/x-ogg": "audio/ogg",
};

const DICTATION_AUDIO_EXTENSIONS = new Set(["mp3", "m4a", "wav", "webm", "ogg"]);

export type DictationAudioRejection = "empty" | "type" | "size";

export function inspectDictationAudioFile(file: { name: string; type: string; size: number }):
  | { ok: true; contentType: AudioContentType; fileName: string }
  | { ok: false; reason: DictationAudioRejection } {
  if (!Number.isFinite(file.size) || file.size <= 0) return { ok: false, reason: "empty" };
  if (file.size > MAX_DICTATION_AUDIO_BYTES) return { ok: false, reason: "size" };

  const name = file.name.trim();
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  const hasExtension = name.includes(".");
  if (hasExtension && !DICTATION_AUDIO_EXTENSIONS.has(extension)) return { ok: false, reason: "type" };

  const contentType = resolveAttachmentContentType(name, file.type);
  if (!contentType || !isAudioContentType(contentType)) return { ok: false, reason: "type" };

  const cleaned = name.replace(/[/\\?%*:|"<>]/g, "_");
  const withExtension = /\.(mp3|m4a|wav|webm|ogg)$/i.test(cleaned)
    ? cleaned
    : `${cleaned || "audio"}.${mimeTypeToExtension(contentType)}`;

  return {
    ok: true,
    contentType,
    fileName: withExtension.slice(0, 160),
  };
}

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
