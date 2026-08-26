import { getDb } from "@/shared/lib/mongodb/client";
import { COLLECTIONS } from "@/shared/lib/mongodb/collections";
import { toObjectId } from "@/shared/lib/mongodb/id";
import {
  createUser,
  findUserByEmail,
  findUserByGoogleId,
  findUserById,
  type UserRecord,
} from "../infrastructure/mongo-user-repository";
import { createProfile } from "../infrastructure/mongo-profile-repository";

export async function findOrCreateGoogleUser(input: {
  googleId: string;
  email: string;
  displayName: string | null;
  locale: "es" | "en";
}): Promise<UserRecord> {
  const existing = (await findUserByGoogleId(input.googleId)) ?? (await findUserByEmail(input.email));

  if (!existing) {
    const user = await createUser({
      email: input.email,
      displayName: input.displayName,
      locale: input.locale,
      googleId: input.googleId,
    });
    await createProfile(user.id, { displayName: input.displayName, locale: input.locale });
    return user;
  }

  if (!existing.googleId) {
    const db = await getDb();
    await db.collection(COLLECTIONS.users).updateOne(
      { _id: toObjectId(existing.id) },
      { $set: { googleId: input.googleId, updatedAt: new Date() } },
    );
    const updated = await findUserById(existing.id);
    if (!updated) throw new Error("Could not complete Google sign-in.");
    return updated;
  }

  return existing;
}
