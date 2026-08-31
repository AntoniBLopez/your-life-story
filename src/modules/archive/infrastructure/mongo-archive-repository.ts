import type { ObjectId } from "mongodb";
import type { LifeEntry } from "@/modules/life-story/domain/life-entry";
import { getFamilyGraph } from "@/modules/family-tree/application/family-service";
import { listLifeEntriesForUser, listLifeEntryLinksForUser } from "@/modules/life-story/application/life-story-service";
import { getProfile, updateProfileFields, upsertProfile } from "@/modules/identity/infrastructure/mongo-profile-repository";
import { findUserByEmail, findUserById } from "@/modules/identity/infrastructure/mongo-user-repository";
import { parseInactivityReleaseYears, shouldReleaseForInactivity, slugifyDisplayName, yearFromDate, type ArchivePublicationRequest, type ArchiveRequestSource, type PublicLifeSummary } from "@/modules/archive/domain/archive";
import { getDb } from "@/shared/lib/mongodb/client";
import { COLLECTIONS } from "@/shared/lib/mongodb/collections";
import { idFromDocument, toObjectId } from "@/shared/lib/mongodb/id";
import { listAttachmentsForUser, type AttachmentRecord } from "@/shared/lib/mongodb/attachments";

type RequestDbRecord = {
  _id: ObjectId;
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
  status: "pending" | "approved" | "rejected";
  reviewedByEmail: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapRequest(record: RequestDbRecord): ArchivePublicationRequest {
  return {
    id: idFromDocument(record),
    targetEmail: record.targetEmail,
    targetUserId: record.targetUserId,
    targetDisplayName: record.targetDisplayName,
    requesterUserId: record.requesterUserId,
    requesterName: record.requesterName,
    requesterEmail: record.requesterEmail,
    relationship: record.relationship,
    deathDate: record.deathDate,
    message: record.message,
    source: record.source,
    status: record.status,
    reviewedByEmail: record.reviewedByEmail,
    reviewedAt: record.reviewedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
  };
}

export async function allocateArchiveSlug(displayName: string, userId: string) {
  const db = await getDb();
  const base = slugifyDisplayName(displayName);
  const existing = await db.collection(COLLECTIONS.profiles).findOne({ archiveSlug: base, userId: { $ne: userId } });
  if (!existing) return base;
  return `${base}-${userId.slice(-6).toLowerCase()}`;
}

export async function listPublishedLives(): Promise<PublicLifeSummary[]> {
  const db = await getDb();
  const profiles = await db.collection(COLLECTIONS.profiles)
    .find({ publishedAt: { $type: "date" }, archiveSlug: { $type: "string" } })
    .sort({ publishedAt: -1 })
    .toArray();

  const summaries = await Promise.all(profiles.map(async (profile) => {
    const userId = String(profile.userId);
    const entries = await listLifeEntriesForUser(userId);
    const years = entries.map((entry) => yearFromDate(entry.startDate)).filter((year): year is string => Boolean(year));
    return {
      userId,
      slug: String(profile.archiveSlug),
      displayName: String(profile.displayName || "Sin nombre"),
      deceased: Boolean(profile.deceasedAt),
      deceasedAt: profile.deceasedAt instanceof Date ? profile.deceasedAt.toISOString() : null,
      publishedAt: profile.publishedAt instanceof Date ? profile.publishedAt.toISOString() : new Date().toISOString(),
      entryCount: entries.length,
      firstYear: years[0] ?? null,
      lastYear: years.at(-1) ?? null,
    } satisfies PublicLifeSummary;
  }));

  return summaries;
}

export async function findPublishedProfileBySlug(slug: string) {
  const db = await getDb();
  const record = await db.collection(COLLECTIONS.profiles).findOne({ archiveSlug: slug, publishedAt: { $type: "date" } });
  if (!record) return null;
  const userId = String(record.userId);
  const [profile, user, entries, links, family, attachments] = await Promise.all([
    getProfile(userId),
    findUserById(userId),
    listLifeEntriesForUser(userId),
    listLifeEntryLinksForUser(userId),
    getFamilyGraph(userId),
    listAttachmentsForUser(userId),
  ]);
  if (!profile?.publishedAt) return null;
  return {
    userId,
    displayName: profile.displayName || user?.displayName || "Sin nombre",
    locale: profile.locale,
    slug: profile.archiveSlug as string,
    deceasedAt: profile.deceasedAt,
    publishedAt: profile.publishedAt,
    entries,
    links,
    family,
    attachments,
  };
}

export async function findPublishedOwnerByAttachment(attachment: AttachmentRecord) {
  const profile = await getProfile(attachment.userId);
  if (!profile?.publishedAt) return null;
  return profile;
}

export async function createPublicationRequest(input: {
  targetEmail: string;
  requesterUserId: string | null;
  requesterName: string;
  requesterEmail: string;
  relationship: string;
  deathDate: string | null;
  message: string;
  source: ArchiveRequestSource;
}) {
  const db = await getDb();
  const target = await findUserByEmail(input.targetEmail);
  const profile = target ? await getProfile(target.id) : null;
  const now = new Date();
  const record = {
    targetEmail: input.targetEmail.toLowerCase(),
    targetUserId: target?.id ?? null,
    targetDisplayName: profile?.displayName ?? target?.displayName ?? null,
    requesterUserId: input.requesterUserId,
    requesterName: input.requesterName,
    requesterEmail: input.requesterEmail.toLowerCase(),
    relationship: input.relationship,
    deathDate: input.deathDate,
    message: input.message,
    source: input.source,
    status: "pending" as const,
    reviewedByEmail: null,
    reviewedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  const { insertedId } = await db.collection(COLLECTIONS.archivePublicationRequests).insertOne(record);
  return mapRequest({ _id: insertedId, ...record });
}

export async function listPublicationRequests(status?: "pending" | "approved" | "rejected") {
  const db = await getDb();
  const filter = status ? { status } : {};
  const rows = await db.collection<RequestDbRecord>(COLLECTIONS.archivePublicationRequests)
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();
  return rows.map(mapRequest);
}

export async function findPublicationRequestById(id: string) {
  const db = await getDb();
  const record = await db.collection<RequestDbRecord>(COLLECTIONS.archivePublicationRequests).findOne({ _id: toObjectId(id) });
  return record ? mapRequest(record) : null;
}

export async function updatePublicationRequestStatus(id: string, status: "approved" | "rejected", reviewerEmail: string) {
  const db = await getDb();
  const now = new Date();
  await db.collection(COLLECTIONS.archivePublicationRequests).updateOne(
    { _id: toObjectId(id) },
    { $set: { status, reviewedByEmail: reviewerEmail, reviewedAt: now, updatedAt: now } },
  );
}

export async function searchUsersForAdmin(query: string) {
  const db = await getDb();
  const needle = query.trim().toLowerCase();
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const filter = needle
    ? {
        $or: [
          { email: { $regex: escaped, $options: "i" } },
          { displayName: { $regex: escaped, $options: "i" } },
        ],
      }
    : {};
  const users = await db.collection(COLLECTIONS.users)
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(30)
    .toArray();

  return Promise.all(users.map(async (user) => {
    const userId = String(user._id);
    const profile = await getProfile(userId);
    const entries = await listLifeEntriesForUser(userId);
    return {
      id: userId,
      email: String(user.email),
      displayName: profile?.displayName ?? (user.displayName as string | null) ?? null,
      publicArchiveConsent: Boolean(profile?.publicArchiveConsent),
      publishedAt: profile?.publishedAt ?? null,
      deceasedAt: profile?.deceasedAt ?? null,
      archiveSlug: profile?.archiveSlug ?? null,
      inactivityReleaseYears: profile?.inactivityReleaseYears ?? null,
      lastSeenAt: profile?.lastSeenAt ?? null,
      entryCount: entries.length,
    };
  }));
}

export async function publishLife(userId: string, options: { deceased?: boolean; deathDate?: string | null; displayName?: string | null }) {
  const profile = await getProfile(userId);
  const user = await findUserById(userId);
  if (!user) throw new Error("User not found");
  const displayName = options.displayName ?? profile?.displayName ?? user.displayName ?? "Sin nombre";
  const slug = profile?.archiveSlug ?? await allocateArchiveSlug(displayName, userId);
  const now = new Date();
  let deceasedAt: Date | null | undefined;
  if (options.deceased) {
    deceasedAt = options.deathDate ? new Date(`${options.deathDate}T00:00:00.000Z`) : (profile?.deceasedAt ? new Date(profile.deceasedAt) : now);
  }
  await upsertProfile(userId, {
    displayName,
    archiveSlug: slug,
    publishedAt: profile?.publishedAt ? new Date(profile.publishedAt) : now,
    ...(options.deceased ? { deceasedAt, publicArchiveConsent: true } : {}),
  });
  return getProfile(userId);
}

export async function unpublishLife(userId: string) {
  await updateProfileFields(userId, { publishedAt: null, publicArchiveConsent: false });
}

export async function releaseDueInactivityArchives(now = new Date()) {
  const db = await getDb();
  const candidates = await db.collection(COLLECTIONS.profiles)
    .find({
      inactivityReleaseYears: { $gte: 1, $lte: 10 },
      $or: [{ deceasedAt: null }, { deceasedAt: { $exists: false } }],
    })
    .toArray();

  const released: string[] = [];
  for (const record of candidates) {
    const userId = String(record.userId);
    const years = parseInactivityReleaseYears(record.inactivityReleaseYears);
    const lastSeenAt = record.lastSeenAt instanceof Date
      ? record.lastSeenAt
      : record.lastSeenAt
        ? new Date(String(record.lastSeenAt))
        : null;
    if (!shouldReleaseForInactivity({ years, lastSeenAt, deceasedAt: record.deceasedAt instanceof Date ? record.deceasedAt : null }, now)) {
      continue;
    }
    await publishLife(userId, { deceased: true });
    released.push(userId);
  }
  return released;
}

export type PublicArchiveLife = {
  userId: string;
  displayName: string;
  locale: "es" | "en";
  slug: string;
  deceasedAt: string | null;
  publishedAt: string;
  entries: LifeEntry[];
  links: Awaited<ReturnType<typeof listLifeEntryLinksForUser>>;
  family: Awaited<ReturnType<typeof getFamilyGraph>>;
  attachments: AttachmentRecord[];
};
