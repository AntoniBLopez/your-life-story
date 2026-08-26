import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { getDb } from "../mongodb/client";
import { COLLECTIONS } from "../mongodb/collections";

const COOKIE_NAME = "yls_session";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MS);
  const db = await getDb();
  await db.collection(COLLECTIONS.sessions).insertOne({ token, userId, expiresAt, createdAt: new Date() });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getSessionUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const db = await getDb();
  const session = await db.collection(COLLECTIONS.sessions).findOne({ token, expiresAt: { $gt: new Date() } });
  return session?.userId as string | undefined ?? null;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    const db = await getDb();
    await db.collection(COLLECTIONS.sessions).deleteOne({ token });
  }
  cookieStore.delete(COOKIE_NAME);
}

export async function destroyAllUserSessions(userId: string) {
  const db = await getDb();
  await db.collection(COLLECTIONS.sessions).deleteMany({ userId });
}
