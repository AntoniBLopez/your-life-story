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

export function isPubliclyArchived(profile: { publishedAt?: string | null }) {
  return Boolean(profile.publishedAt);
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

export function shouldReleaseForInactivity(
  input: {
    years: number | null;
    lastSeenAt: string | Date | null;
    deceasedAt?: string | Date | null;
  },
  now = new Date(),
) {
  if (input.deceasedAt) return false;
  const years = parseInactivityReleaseYears(input.years);
  if (!years || !input.lastSeenAt) return false;
  const lastSeen = input.lastSeenAt instanceof Date ? input.lastSeenAt : new Date(input.lastSeenAt);
  if (Number.isNaN(lastSeen.getTime())) return false;
  return now.getTime() >= inactivityReleaseDueAt(lastSeen, years).getTime();
}
