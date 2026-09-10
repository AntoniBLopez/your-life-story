import type { LifeEntryTextContainsAi, LifeEntryTextOrigins } from "./life-entry-text-origin";

export type {
  HumanTextOrigin,
  LifeEntryProseField,
  LifeEntryTextContainsAi,
  LifeEntryTextOrigins,
} from "./life-entry-text-origin";
export {
  defaultLifeEntryProvenance,
  defaultTextOriginsFromContent,
  emptyTextContainsAi,
  emptyTextOrigins,
  isOwnVoiceField,
  LIFE_ENTRY_PROSE_FIELDS,
} from "./life-entry-text-origin";

export const LIFE_AREAS = [
  "general",
  "health",
  "relationships",
  "work",
  "education",
  "home",
  "identity",
  "finances",
  "other",
] as const;

export const CHANGE_DIRECTIONS = ["improved", "difficult", "mixed", "neutral"] as const;
export const DATE_PRECISIONS = ["day", "month", "year"] as const;
export const MOMENT_FLAGS = ["critical", "inflection", "turning_point"] as const;

/** Long-form text per experience field (narrative, difficulty, learning, transformation). */
export const LIFE_ENTRY_TEXT_MAX = 50_000;
export const LIFE_ENTRY_TITLE_MAX = 160;

export type LifeArea = (typeof LIFE_AREAS)[number];
export type ChangeDirection = (typeof CHANGE_DIRECTIONS)[number];
export type DatePrecision = (typeof DATE_PRECISIONS)[number];
export type MomentFlag = (typeof MOMENT_FLAGS)[number];

export type LifeEntry = {
  id: string;
  userId: string;
  startDate: string;
  endDate: string | null;
  datePrecision: DatePrecision;
  title: string;
  narrative: string | null;
  lifeArea: LifeArea;
  lifeAreas: LifeArea[];
  changeDirection: ChangeDirection;
  momentFlags: MomentFlag[];
  difficulty: string | null;
  learning: string | null;
  transformation: string | null;
  tags: string[];
  textOrigins: LifeEntryTextOrigins;
  textContainsAi: LifeEntryTextContainsAi;
  aiClassified: boolean;
  createdAt: string;
};

export type LifeEntryLink = {
  id: string;
  sourceEntryId: string;
  targetEntryId: string;
  relation: "related" | "consequence";
};

export function assertValidStoryDates(startDate: string, endDate?: string | null) {
  if (!startDate) throw new Error("A start date is required.");
  if (endDate && endDate < startDate) {
    throw new Error("The end date cannot be before the start date.");
  }
}

export function entryTone(direction: ChangeDirection) {
  return {
    improved: "#5c9265",
    difficult: "#c87a70",
    mixed: "#d9a45b",
    neutral: "#8b9c92",
  }[direction];
}

export function momentFlagLabel(flag: MomentFlag, locale: "es" | "en") {
  const labels = {
    es: { critical: "Momento crítico", inflection: "Punto de inflexión", turning_point: "Giro vital" },
    en: { critical: "Critical moment", inflection: "Inflection point", turning_point: "Turning point" },
  };
  return labels[locale][flag];
}

export function lifeAreaLabel(area: LifeArea, locale: "es" | "en") {
  const labels = {
    es: {
      general: "En general",
      health: "Salud",
      relationships: "Relaciones",
      work: "Trabajo",
      education: "Educación",
      home: "Hogar",
      identity: "Identidad",
      finances: "Finanzas",
      other: "Otra",
    },
    en: {
      general: "General",
      health: "Health",
      relationships: "Relationships",
      work: "Work",
      education: "Education",
      home: "Home",
      identity: "Identity",
      finances: "Finances",
      other: "Other",
    },
  };
  return labels[locale][area];
}
