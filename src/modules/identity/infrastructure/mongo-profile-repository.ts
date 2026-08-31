import type { ObjectId } from "mongodb";
import type { Profile, SupportedLocale } from "@/modules/identity/domain/profile";
import { getDb } from "@/shared/lib/mongodb/client";
import { COLLECTIONS } from "@/shared/lib/mongodb/collections";

type ProfileDbRecord = {
  _id: ObjectId;
  userId: string;
  displayName: string | null;
  locale: SupportedLocale;
  aiConsentAt: Date | null;
  onboardedAt: Date | null;
  publicArchiveConsent?: boolean;
  archiveSlug?: string | null;
  publishedAt?: Date | null;
  deceasedAt?: Date | null;
  lastSeenAt?: Date | null;
  inactivityReleaseYears?: number | null;
  saveVoiceRecordings?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ProfileWritableFields = Partial<
  Pick<
    ProfileDbRecord,
    | "displayName"
    | "locale"
    | "aiConsentAt"
    | "onboardedAt"
    | "publicArchiveConsent"
    | "archiveSlug"
    | "publishedAt"
    | "deceasedAt"
    | "lastSeenAt"
    | "inactivityReleaseYears"
    | "saveVoiceRecordings"
  >
>;

function mapProfile(record: ProfileDbRecord): Profile {
  return {
    id: record.userId,
    displayName: record.displayName,
    locale: record.locale,
    aiConsentAt: record.aiConsentAt?.toISOString() ?? null,
    onboardedAt: record.onboardedAt?.toISOString() ?? null,
    publicArchiveConsent: Boolean(record.publicArchiveConsent),
    archiveSlug: record.archiveSlug ?? null,
    publishedAt: record.publishedAt?.toISOString() ?? null,
    deceasedAt: record.deceasedAt?.toISOString() ?? null,
    lastSeenAt: record.lastSeenAt?.toISOString() ?? null,
    inactivityReleaseYears: typeof record.inactivityReleaseYears === "number" ? record.inactivityReleaseYears : null,
    saveVoiceRecordings: record.saveVoiceRecordings !== false,
  };
}

export async function createProfile(userId: string, input: { displayName?: string | null; locale: SupportedLocale }) {
  const db = await getDb();
  const now = new Date();
  const record = {
    userId,
    displayName: input.displayName ?? null,
    locale: input.locale,
    aiConsentAt: null,
    onboardedAt: null,
    publicArchiveConsent: false,
    archiveSlug: null,
    publishedAt: null,
    deceasedAt: null,
    lastSeenAt: now,
    inactivityReleaseYears: null,
    saveVoiceRecordings: true,
    createdAt: now,
    updatedAt: now,
  };
  const { insertedId } = await db.collection(COLLECTIONS.profiles).insertOne(record);
  return mapProfile({ _id: insertedId, ...record });
}

export async function getProfile(userId: string) {
  const db = await getDb();
  const record = await db.collection<ProfileDbRecord>(COLLECTIONS.profiles).findOne({ userId });
  return record ? mapProfile(record) : null;
}

export async function upsertProfile(userId: string, fields: ProfileWritableFields) {
  const db = await getDb();
  const now = new Date();
  await db.collection(COLLECTIONS.profiles).updateOne(
    { userId },
    {
      $set: { ...fields, updatedAt: now },
      $setOnInsert: { userId, createdAt: now },
    },
    { upsert: true },
  );
  return getProfile(userId);
}

export async function updateProfileFields(userId: string, fields: ProfileWritableFields) {
  const db = await getDb();
  await db.collection(COLLECTIONS.profiles).updateOne({ userId }, { $set: { ...fields, updatedAt: new Date() } });
}

const LAST_SEEN_TOUCH_MS = 12 * 60 * 60 * 1000;

export async function touchLastSeen(userId: string) {
  const profile = await getProfile(userId);
  const lastSeen = profile?.lastSeenAt ? new Date(profile.lastSeenAt).getTime() : 0;
  if (Date.now() - lastSeen < LAST_SEEN_TOUCH_MS) return;
  await updateProfileFields(userId, { lastSeenAt: new Date() });
}
