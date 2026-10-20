export const VOICE_FIELD_KEYS = ["title", "narrative", "difficulty", "learning", "transformation", "full"] as const;
export type VoiceFieldKey = (typeof VOICE_FIELD_KEYS)[number];

export const AUDIO_CONTENT_TYPES = [
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/x-m4a",
] as const;

export type AudioContentType = (typeof AUDIO_CONTENT_TYPES)[number];

/** Same ceiling as experience attachments and `/api/ai/transcribe`. */
export const MAX_DICTATION_AUDIO_BYTES = 15 * 1024 * 1024;

export const DICTATION_AUDIO_ACCEPT = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/webm",
  "audio/ogg",
  ".mp3",
  ".m4a",
  ".wav",
  ".webm",
  ".ogg",
].join(",");

export function audioContentTypeForTranscription(contentType: string) {
  const normalized = normalizeAudioContentType(contentType);
  return normalized === "audio/x-m4a" ? "audio/mp4" : normalized;
}

export type PendingVoiceNote = {
  fieldKey: VoiceFieldKey;
  fileName: string;
  contentType: AudioContentType;
  size: number;
  fileBase64: string;
  transcript: string;
};

export function appendTranscript(current: string, transcript: string) {
  const next = transcript.trim();
  if (!next) return current;
  const base = current.trim();
  return base ? `${base}\n\n${next}` : next;
}

export function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read audio."));
    reader.readAsDataURL(blob);
  });
}

export function pickRecordingMimeType() {
  if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
    return "audio/webm;codecs=opus";
  }
  if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm")) {
    return "audio/webm";
  }
  if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/mp4")) {
    return "audio/mp4";
  }
  return "audio/webm";
}

export function mimeTypeToExtension(mimeType: string) {
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

export function normalizeAudioContentType(mimeType: string): AudioContentType {
  const base = mimeType.split(";")[0]?.trim().toLowerCase() ?? "audio/webm";
  if (AUDIO_CONTENT_TYPES.includes(base as AudioContentType)) return base as AudioContentType;
  if (base === "audio/mp4") return "audio/mp4";
  return "audio/webm";
}

export function base64ToBlobUrl(fileBase64: string, mimeType: string) {
  const bytes = Uint8Array.from(atob(fileBase64), (char) => char.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}
