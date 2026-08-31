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
