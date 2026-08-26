import type { ObjectId } from "mongodb";
import type { SupportedLocale } from "@/modules/identity/domain/profile";
import { getDb } from "@/shared/lib/mongodb/client";
import { COLLECTIONS } from "@/shared/lib/mongodb/collections";
import { hashPassword } from "@/shared/lib/auth/password";
import { idFromDocument, toObjectId } from "@/shared/lib/mongodb/id";

type UserDbRecord = {
  _id: ObjectId;
  email: string;
  passwordHash: string | null;
  displayName: string | null;
  locale: SupportedLocale;
  googleId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string | null;
  displayName: string | null;
  locale: SupportedLocale;
  googleId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapUser(record: UserDbRecord): UserRecord {
  return {
    id: idFromDocument(record),
    email: record.email,
    passwordHash: record.passwordHash,
    displayName: record.displayName,
    locale: record.locale,
    googleId: record.googleId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function findUserByEmail(email: string) {
  const db = await getDb();
  const record = await db.collection<UserDbRecord>(COLLECTIONS.users).findOne({ email: email.toLowerCase() });
  return record ? mapUser(record) : null;
}

export async function findUserById(id: string) {
  const db = await getDb();
  const record = await db.collection<UserDbRecord>(COLLECTIONS.users).findOne({ _id: toObjectId(id) });
  return record ? mapUser(record) : null;
}

export async function findUserByGoogleId(googleId: string) {
  const db = await getDb();
  const record = await db.collection<UserDbRecord>(COLLECTIONS.users).findOne({ googleId });
  return record ? mapUser(record) : null;
}

export async function createUser(input: {
  email: string;
  password?: string;
  displayName?: string | null;
  locale: SupportedLocale;
  googleId?: string | null;
}) {
  const db = await getDb();
  const now = new Date();
  const passwordHash = input.password ? await hashPassword(input.password) : null;
  const record = {
    email: input.email.toLowerCase(),
    passwordHash,
    displayName: input.displayName ?? null,
    locale: input.locale,
    googleId: input.googleId ?? null,
    createdAt: now,
    updatedAt: now,
  };
  const { insertedId } = await db.collection(COLLECTIONS.users).insertOne(record);
  return mapUser({ _id: insertedId, ...record });
}

export async function deleteUser(userId: string) {
  const db = await getDb();
  await db.collection(COLLECTIONS.users).deleteOne({ _id: toObjectId(userId) });
}

export async function createPasswordResetToken(userId: string) {
  const db = await getDb();
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await db.collection(COLLECTIONS.passwordResetTokens).insertOne({ token, userId, expiresAt, createdAt: new Date() });
  return token;
}

export async function consumePasswordResetToken(token: string) {
  const db = await getDb();
  const record = await db.collection(COLLECTIONS.passwordResetTokens).findOne({ token, expiresAt: { $gt: new Date() } });
  if (!record) return null;
  await db.collection(COLLECTIONS.passwordResetTokens).deleteOne({ token });
  return record.userId as string;
}

export async function updateUserPassword(userId: string, password: string) {
  const db = await getDb();
  const passwordHash = await hashPassword(password);
  await db.collection(COLLECTIONS.users).updateOne({ _id: toObjectId(userId) }, { $set: { passwordHash, updatedAt: new Date() } });
}
