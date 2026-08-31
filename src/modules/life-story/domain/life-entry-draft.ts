import type { ChangeDirection, DatePrecision, LifeArea, MomentFlag } from "@/modules/life-story/domain/life-entry";
import type { PendingVoiceNote } from "@/modules/life-story/domain/voice-note";

export type LifeEntryDraft = {
  title: string;
  narrative: string;
  difficulty: string;
  learning: string;
  transformation: string;
  lifeAreas: LifeArea[];
  changeDirection: ChangeDirection;
  momentFlags: MomentFlag[];
  tags: string;
  startDate: string;
  endDate: string;
  datePrecision: DatePrecision;
  linkedEntryId: string;
  linkType: "related" | "consequence";
  pendingVoiceNotes: PendingVoiceNote[];
};

const STORAGE_PREFIX = "life-entry-draft:";

export function getLifeEntryDraftKey(entryId?: string) {
  return `${STORAGE_PREFIX}${entryId ?? "new"}`;
}

export function loadLifeEntryDraft(key: string): LifeEntryDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as LifeEntryDraft;
  } catch {
    return null;
  }
}

export function saveLifeEntryDraft(key: string, draft: LifeEntryDraft) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // sessionStorage can fill up with large voice notes; ignore quota errors.
  }
}

export function clearLifeEntryDraft(key: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(key);
}
