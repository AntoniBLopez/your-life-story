export const ARCHIVE_ADMIN_EMAIL = "toniblopez1@gmail.com";

export type ArchiveRequestStatus = "pending" | "approved" | "rejected";
export type ArchiveRequestSource = "family" | "public" | "admin";

export type PublicLifeSummary = {
  userId: string;
  slug: string;
  displayName: string;
  deceased: boolean;
  deceasedAt: string | null;
  publishedAt: string;
  entryCount: number;
  firstYear: string | null;
  lastYear: string | null;
  highlight: string | null;
  highlightKind: "lesson" | "moment" | null;
};

export type ArchivePublicationRequest = {
  id: string;
  targetEmail: string;
  targetUserId: string | null;
  targetDisplayName: string | null;
  requesterUserId: string | null;
  requesterName: string;
  requesterEmail: string;
  relationship: string;
  deathDate: string | null;
  message: string;
  source: ArchiveRequestSource;
  status: ArchiveRequestStatus;
  reviewedByEmail: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export function isArchiveAdmin(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase() === ARCHIVE_ADMIN_EMAIL;
}

export function slugifyDisplayName(name: string) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "vida";
}

export function yearFromDate(value: string | null | undefined) {
  if (!value) return null;
  const year = value.slice(0, 4);
  return /^\d{4}$/.test(year) ? year : null;
}

export function pickLifeHighlight(entries: Array<{
  title: string;
  learning: string | null;
  transformation: string | null;
  difficulty: string | null;
  momentFlags: string[];
}>) {
  const withLearning = entries.find((entry) => entry.learning?.trim());
  if (withLearning?.learning) {
    return { highlight: withLearning.learning.trim().slice(0, 180), highlightKind: "lesson" as const };
  }
  const turning = entries.find((entry) => entry.momentFlags.length > 0);
  if (turning) {
    return { highlight: turning.title.trim(), highlightKind: "moment" as const };
  }
  const withChange = entries.find((entry) => entry.transformation?.trim() || entry.difficulty?.trim());
  if (withChange) {
    return {
      highlight: (withChange.transformation || withChange.difficulty || "").trim().slice(0, 180),
      highlightKind: "moment" as const,
    };
  }
  return { highlight: null, highlightKind: null };
}

export function isPubliclyArchived(profile: { publishedAt?: string | null }) {
  return Boolean(profile.publishedAt);
}

export function gavePublicPublicationPermission(profile: {
  publicArchiveConsent?: boolean;
  inactivityReleaseYears?: number | null;
}) {
  return Boolean(profile.publicArchiveConsent) || parseInactivityReleaseYears(profile.inactivityReleaseYears) !== null;
}

export const INACTIVITY_RELEASE_MIN_YEARS = 1;
export const INACTIVITY_RELEASE_MAX_YEARS = 10;
export const INACTIVITY_RELEASE_YEARS = Array.from(
  { length: INACTIVITY_RELEASE_MAX_YEARS - INACTIVITY_RELEASE_MIN_YEARS + 1 },
  (_, index) => INACTIVITY_RELEASE_MIN_YEARS + index,
);

export function parseInactivityReleaseYears(value: unknown): number | null {
  const years = typeof value === "string" ? Number(value) : value;
  if (typeof years !== "number" || !Number.isInteger(years)) return null;
  if (years < INACTIVITY_RELEASE_MIN_YEARS || years > INACTIVITY_RELEASE_MAX_YEARS) return null;
  return years;
}

export function inactivityReleaseDueAt(lastSeenAt: Date, years: number) {
  const due = new Date(lastSeenAt.getTime());
  due.setUTCFullYear(due.getUTCFullYear() + years);
  return due;
}

export const INACTIVITY_NOTICE_STAGES = ["months_3", "months_2", "months_1", "weeks_2"] as const;
export type InactivityNoticeStage = (typeof INACTIVITY_NOTICE_STAGES)[number];

const DAY_MS = 24 * 60 * 60 * 1000;

export function addUtcMonths(date: Date, months: number) {
  const result = new Date(date.getTime());
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

function toDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function inactivityNoticeAt(releaseAt: Date, stage: InactivityNoticeStage) {
  if (stage === "weeks_2") return new Date(releaseAt.getTime() - 14 * DAY_MS);
  const months = stage === "months_3" ? 3 : stage === "months_2" ? 2 : 1;
  return addUtcMonths(releaseAt, -months);
}

export function inactivityEffectiveReleaseAt(plannedReleaseAt: Date, firstNoticeAt: string | Date | null | undefined) {
  const firstNotice = toDate(firstNoticeAt);
  if (!firstNotice) return plannedReleaseAt;
  const minimum = addUtcMonths(firstNotice, 3);
  return minimum.getTime() > plannedReleaseAt.getTime() ? minimum : plannedReleaseAt;
}

export function nextInactivityNoticeStage(input: {
  plannedReleaseAt: Date;
  firstNoticeAt?: string | Date | null;
  sent?: readonly string[] | null;
  now?: Date;
}): InactivityNoticeStage | null {
  const now = input.now ?? new Date();
  const sent = new Set(input.sent ?? []);
  if (!sent.has("months_3")) {
    if (now.getTime() >= inactivityNoticeAt(input.plannedReleaseAt, "months_3").getTime()) return "months_3";
    return null;
  }
  const releaseAt = inactivityEffectiveReleaseAt(input.plannedReleaseAt, input.firstNoticeAt);
  const remaining: InactivityNoticeStage[] = ["months_2", "months_1", "weeks_2"];
  const due = remaining.filter((stage) => !sent.has(stage) && now.getTime() >= inactivityNoticeAt(releaseAt, stage).getTime());
  return due[0] ?? null;
}

export function shouldReleaseForInactivity(
  input: {
    years: number | null;
    lastSeenAt: string | Date | null;
    deceasedAt?: string | Date | null;
    firstNoticeAt?: string | Date | null;
  },
  now = new Date(),
) {
  if (input.deceasedAt) return false;
  const years = parseInactivityReleaseYears(input.years);
  const lastSeen = toDate(input.lastSeenAt);
  const firstNotice = toDate(input.firstNoticeAt);
  if (!years || !lastSeen || !firstNotice) return false;
  const planned = inactivityReleaseDueAt(lastSeen, years);
  return now.getTime() >= inactivityEffectiveReleaseAt(planned, firstNotice).getTime();
}
