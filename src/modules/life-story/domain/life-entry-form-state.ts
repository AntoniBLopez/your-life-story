import type { ChangeDirection, DatePrecision, LifeArea, LifeEntry, LifeEntryLink, MomentFlag } from "./life-entry";
import type { LifeEntryTextContainsAi, LifeEntryTextOrigins } from "./life-entry-text-origin";
import { defaultLifeEntryProvenance, emptyTextContainsAi, emptyTextOrigins } from "./life-entry-text-origin";
import type { LifeEntryDraft } from "./life-entry-draft";

export type LifeEntryFormSnapshot = Omit<LifeEntryDraft, "pendingVoiceNotes" | "textOrigins" | "textContainsAi" | "aiClassified"> & {
  textOrigins: LifeEntryTextOrigins;
  textContainsAi: LifeEntryTextContainsAi;
  aiClassified: boolean;
};

function text(value: string | null | undefined) {
  return value ?? "";
}

function dateValue(value: string | null | undefined) {
  const raw = text(value).trim();
  return raw.length >= 10 ? raw.slice(0, 10) : raw;
}

function normalizeTags(value: string | null | undefined) {
  return Array.from(new Set(
    text(value)
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean),
  )).sort().join(", ");
}

function sortedCopy<T extends string>(values: T[] | null | undefined) {
  return [...(values ?? [])].sort();
}

export function normalizeLifeEntryFormSnapshot(snapshot: LifeEntryFormSnapshot): LifeEntryFormSnapshot {
  return {
    title: text(snapshot.title),
    narrative: text(snapshot.narrative),
    difficulty: text(snapshot.difficulty),
    learning: text(snapshot.learning),
    transformation: text(snapshot.transformation),
    lifeAreas: sortedCopy(snapshot.lifeAreas) as LifeArea[],
    changeDirection: (snapshot.changeDirection ?? "neutral") as ChangeDirection,
    momentFlags: sortedCopy(snapshot.momentFlags) as MomentFlag[],
    tags: normalizeTags(snapshot.tags),
    startDate: dateValue(snapshot.startDate),
    endDate: dateValue(snapshot.endDate),
    datePrecision: (snapshot.datePrecision ?? "day") as DatePrecision,
    linkedEntryId: text(snapshot.linkedEntryId).trim(),
    linkType: snapshot.linkType === "consequence" ? "consequence" : "related",
    textOrigins: snapshot.textOrigins ?? emptyTextOrigins(),
    textContainsAi: snapshot.textContainsAi ?? emptyTextContainsAi(),
    aiClassified: snapshot.aiClassified === true,
  };
}

export function buildLifeEntryFormSnapshot(entry: LifeEntry, link?: LifeEntryLink | null): LifeEntryFormSnapshot {
  const lifeAreas = entry.lifeAreas?.length
    ? [...entry.lifeAreas]
    : entry.lifeArea
      ? [entry.lifeArea]
      : [];

  return normalizeLifeEntryFormSnapshot({
    title: entry.title,
    narrative: entry.narrative ?? "",
    difficulty: entry.difficulty ?? "",
    learning: entry.learning ?? "",
    transformation: entry.transformation ?? "",
    lifeAreas,
    changeDirection: entry.changeDirection ?? "neutral",
    momentFlags: [...(entry.momentFlags ?? [])],
    tags: (entry.tags ?? []).join(", "),
    startDate: entry.startDate,
    endDate: entry.endDate ?? "",
    datePrecision: entry.datePrecision ?? "day",
    linkedEntryId: link?.targetEntryId ?? "",
    linkType: link?.relation ?? "related",
    textOrigins: entry.textOrigins,
    textContainsAi: entry.textContainsAi,
    aiClassified: entry.aiClassified,
  });
}

export function snapshotFromDraft(draft: LifeEntryDraft): LifeEntryFormSnapshot {
  return normalizeLifeEntryFormSnapshot({
    title: draft.title,
    narrative: draft.narrative,
    difficulty: draft.difficulty,
    learning: draft.learning,
    transformation: draft.transformation,
    lifeAreas: [...(draft.lifeAreas ?? [])],
    changeDirection: draft.changeDirection,
    momentFlags: [...(draft.momentFlags ?? [])],
    tags: draft.tags,
    startDate: draft.startDate,
    endDate: draft.endDate,
    datePrecision: draft.datePrecision,
    linkedEntryId: draft.linkedEntryId,
    linkType: draft.linkType,
    ...defaultLifeEntryProvenance(draft),
    ...(draft.textOrigins ? { textOrigins: draft.textOrigins } : {}),
    ...(draft.textContainsAi ? { textContainsAi: draft.textContainsAi } : {}),
    ...(draft.aiClassified !== undefined ? { aiClassified: draft.aiClassified } : {}),
  });
}

export function lifeEntryFormSnapshotsEqual(left: LifeEntryFormSnapshot, right: LifeEntryFormSnapshot) {
  const a = normalizeLifeEntryFormSnapshot(left);
  const b = normalizeLifeEntryFormSnapshot(right);
  return (
    a.title === b.title
    && a.narrative === b.narrative
    && a.difficulty === b.difficulty
    && a.learning === b.learning
    && a.transformation === b.transformation
    && a.lifeAreas.join(",") === b.lifeAreas.join(",")
    && a.changeDirection === b.changeDirection
    && a.momentFlags.join(",") === b.momentFlags.join(",")
    && a.tags === b.tags
    && a.startDate === b.startDate
    && a.endDate === b.endDate
    && a.datePrecision === b.datePrecision
    && a.linkedEntryId === b.linkedEntryId
    && a.linkType === b.linkType
    && JSON.stringify(a.textOrigins) === JSON.stringify(b.textOrigins)
    && JSON.stringify(a.textContainsAi) === JSON.stringify(b.textContainsAi)
    && a.aiClassified === b.aiClassified
  );
}

export function currentLifeEntryFormSnapshot(state: LifeEntryFormSnapshot): LifeEntryFormSnapshot {
  return normalizeLifeEntryFormSnapshot(state);
}

export function emptyLifeEntryFormSnapshot(): LifeEntryFormSnapshot {
  return normalizeLifeEntryFormSnapshot({
    title: "",
    narrative: "",
    difficulty: "",
    learning: "",
    transformation: "",
    lifeAreas: [],
    changeDirection: "neutral",
    momentFlags: [],
    tags: "",
    startDate: "",
    endDate: "",
    datePrecision: "day",
    linkedEntryId: "",
    linkType: "related",
    textOrigins: emptyTextOrigins(),
    textContainsAi: emptyTextContainsAi(),
    aiClassified: false,
  });
}
