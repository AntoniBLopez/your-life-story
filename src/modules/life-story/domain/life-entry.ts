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

export type LifeArea = (typeof LIFE_AREAS)[number];
export type ChangeDirection = (typeof CHANGE_DIRECTIONS)[number];
export type DatePrecision = (typeof DATE_PRECISIONS)[number];

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
  difficulty: string | null;
  learning: string | null;
  transformation: string | null;
  tags: string[];
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
