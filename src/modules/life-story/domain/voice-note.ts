import { MAX_AUDIO_ATTACHMENT_BYTES } from "./attachment-upload";

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

/** Largest audio that can be recorded/uploaded (see MAX_AUDIO_ATTACHMENT_BYTES). */
export const MAX_DICTATION_AUDIO_BYTES = MAX_AUDIO_ATTACHMENT_BYTES;

/**
 * Largest audio sent inline (base64 JSON) to `/api/ai/transcribe`, used only before an
 * experience exists. 3 MB → ~4 MB base64, under Vercel's 4.5 MB request limit. Anything
 * longer is saved first and transcribed in segments from storage.
 */
export const DIRECT_TRANSCRIBE_MAX_BYTES = 3 * 1024 * 1024;

/** Recording bitrate: 32 kbps Opus is clear for speech and keeps 1 h ≈ 14 MB, 5 h ≈ 72 MB. */
export const RECORDING_AUDIO_BITS_PER_SECOND = 32_000;

/** MediaRecorder hands over data every 15 s, so long recordings can be backed up as they go. */
export const RECORDING_TIMESLICE_MS = 15_000;

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
  /** Inline audio for short notes (also kept in the local draft). Empty when `blob` is set. */
  fileBase64: string;
  /** Long notes keep the audio as a Blob (too big for the draft; the IndexedDB backup covers it). */
  blob?: Blob;
  transcript: string;
  /** IndexedDB recording backup to delete once the note is stored on the server. */
  backupId?: string | null;
  /** Long audio: transcribe it in segments after the experience is saved. */
  needsTranscription?: boolean;
  /** The user doesn't keep voice files: delete the audio once transcribed. */
  deleteAfterTranscription?: boolean;
};

export function pendingVoiceNoteBlob(note: PendingVoiceNote) {
  return note.blob ?? base64ToBlob(note.fileBase64, note.contentType);
}

/**
 * Appends a transcript to a form field without exceeding its maximum length. Long
 * transcripts are cut at a sentence/word boundary; the full text stays on the audio.
 */
export function appendTranscriptWithin(current: string, transcript: string, maxLength: number) {
  const full = appendTranscript(current, transcript);
  if (full.length <= maxLength) return { value: full, truncated: false };
  const base = current.trim();
  const room = maxLength - (base ? base.length + 2 : 0) - 1;
  if (room <= 0) return { value: current, truncated: true };
  let cut = transcript.trim().slice(0, room);
  const sentenceEnd = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  if (sentenceEnd > room * 0.8) cut = cut.slice(0, sentenceEnd + 1);
  else if (cut.lastIndexOf(" ") > room * 0.8) cut = cut.slice(0, cut.lastIndexOf(" "));
  return { value: appendTranscript(current, `${cut.trim()}…`), truncated: true };
}

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

export function base64ToBlob(fileBase64: string, mimeType: string) {
  const bytes = Uint8Array.from(atob(fileBase64), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}

export function base64ToBlobUrl(fileBase64: string, mimeType: string) {
  return URL.createObjectURL(base64ToBlob(fileBase64, mimeType));
}

/** e.g. "narrative-1729440000000.webm" */
export function voiceNoteFileName(prefix: string, contentType: string) {
  return `${prefix}-${Date.now()}.${mimeTypeToExtension(contentType)}`;
}
