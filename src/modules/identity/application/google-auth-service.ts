import { getDb } from "@/shared/lib/mongodb/client";
import { COLLECTIONS } from "@/shared/lib/mongodb/collections";
import {
  createUser,
  findUserByEmail,
  findUserByGoogleId,
  findUserById,
} from "../infrastructure/mongo-user-repository";
import { createProfile } from "../infrastructure/mongo-profile-repository";

export async function findOrCreateGoogleUser(input: {
  googleId: string;
  email: string;
  displayName: string | null;
  locale: "es" | "en";
}) {
  let user = await findUserByGoogleId(input.googleId);
  if (!user) user = await findUserByEmail(input.email);

  if (!user) {
    user = await createUser({
      email: input.email,
      displayName: input.displayName,
      locale: input.locale,
      googleId: input.googleId,
    });
    await createProfile(user.id, { displayName: input.displayName, locale: input.locale });
    return user;
  }

  if (!user.googleId) {
    const db = await getDb();
    await db.collection(COLLECTIONS.users).updateOne(
      { id: user.id },
      { $set: { googleId: input.googleId, updatedAt: new Date() } },
    );
    user = await findUserById(user.id);
  }

  return user!;
}
