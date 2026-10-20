/**
 * Hand-off between the "new experience" page and the edit page it redirects to: which
 * just-uploaded long audios still need transcribing, and any voice note that failed to upload.
 */
export type AutoTranscribeItem = { attachmentId: string; fieldKey: string | null; deleteAfterTranscription: boolean };

const QUEUE_PREFIX = "yls-auto-transcribe:";
const NOTICE_PREFIX = "yls-voice-notice:";

function storage() {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function queueAutoTranscription(entryId: string, items: AutoTranscribeItem[]) {
  if (items.length) storage()?.setItem(QUEUE_PREFIX + entryId, JSON.stringify(items));
}

export function takeAutoTranscription(entryId: string): AutoTranscribeItem[] {
  const store = storage();
  const raw = store?.getItem(QUEUE_PREFIX + entryId);
  if (!raw) return [];
  store?.removeItem(QUEUE_PREFIX + entryId);
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is AutoTranscribeItem => typeof item?.attachmentId === "string") : [];
  } catch {
    return [];
  }
}

export function leaveVoiceNotice(entryId: string, message: string) {
  storage()?.setItem(NOTICE_PREFIX + entryId, message);
}

export function takeVoiceNotice(entryId: string) {
  const store = storage();
  const message = store?.getItem(NOTICE_PREFIX + entryId) ?? null;
  if (message) store?.removeItem(NOTICE_PREFIX + entryId);
  return message;
}
