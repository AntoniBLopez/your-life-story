import type { SupportedLocale } from "@/modules/identity/domain/profile";
import { getDb } from "@/shared/lib/mongodb/client";
import { COLLECTIONS } from "@/shared/lib/mongodb/collections";
import { hashPassword } from "@/shared/lib/auth/password";

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

export async function findUserByEmail(email: string) {
  const db = await getDb();
  return db.collection<UserRecord>(COLLECTIONS.users).findOne({ email: email.toLowerCase() });
}

export async function findUserById(id: string) {
  const db = await getDb();
  return db.collection<UserRecord>(COLLECTIONS.users).findOne({ id });
}

export async function findUserByGoogleId(googleId: string) {
  const db = await getDb();
  return db.collection<UserRecord>(COLLECTIONS.users).findOne({ googleId });
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
  const id = crypto.randomUUID();
  const passwordHash = input.password ? await hashPassword(input.password) : null;
  const user: UserRecord = {
    id,
    email: input.email.toLowerCase(),
    passwordHash,
    displayName: input.displayName ?? null,
    locale: input.locale,
    googleId: input.googleId ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await db.collection(COLLECTIONS.users).insertOne(user);
  return user;
}

export async function deleteUser(userId: string) {
  const db = await getDb();
  await db.collection(COLLECTIONS.users).deleteOne({ id: userId });
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
  await db.collection(COLLECTIONS.users).updateOne({ id: userId }, { $set: { passwordHash, updatedAt: new Date() } });
}
