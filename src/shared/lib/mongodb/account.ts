import { getDb } from "@/shared/lib/mongodb/client";
import { COLLECTIONS } from "@/shared/lib/mongodb/collections";
import { deleteAllUserAttachments } from "@/shared/lib/mongodb/attachments";
import { destroyAllUserSessions } from "@/shared/lib/auth/session";
import { toObjectId } from "@/shared/lib/mongodb/id";

export async function deleteAllUserData(userId: string) {
  const db = await getDb();
  await deleteAllUserAttachments(userId);
  await Promise.all([
    db.collection(COLLECTIONS.lifeEntries).deleteMany({ userId }),
    db.collection(COLLECTIONS.lifeEntryLinks).deleteMany({ userId }),
    db.collection(COLLECTIONS.familyPeople).deleteMany({ userId }),
    db.collection(COLLECTIONS.familyRelationships).deleteMany({ userId }),
    db.collection(COLLECTIONS.chatThreads).deleteMany({ userId }),
    db.collection(COLLECTIONS.chatMessages).deleteMany({ userId }),
    db.collection(COLLECTIONS.profiles).deleteMany({ userId }),
    db.collection(COLLECTIONS.passwordResetTokens).deleteMany({ userId }),
    db.collection(COLLECTIONS.sessions).deleteMany({ userId }),
    db.collection(COLLECTIONS.users).deleteMany({ _id: toObjectId(userId) }),
  ]);
  await destroyAllUserSessions(userId);
}

export async function exportUserData(userId: string) {
  const db = await getDb();
  const [
    profiles,
    life_entries,
    life_entry_links,
    entry_attachments,
    family_people,
    family_relationships,
    chat_threads,
    chat_messages,
  ] = await Promise.all([
    db.collection(COLLECTIONS.profiles).find({ userId }).toArray(),
    db.collection(COLLECTIONS.lifeEntries).find({ userId }).toArray(),
    db.collection(COLLECTIONS.lifeEntryLinks).find({ userId }).toArray(),
    db.collection(COLLECTIONS.entryAttachments).find({ userId }).toArray(),
    db.collection(COLLECTIONS.familyPeople).find({ userId }).toArray(),
    db.collection(COLLECTIONS.familyRelationships).find({ userId }).toArray(),
    db.collection(COLLECTIONS.chatThreads).find({ userId }).toArray(),
    db.collection(COLLECTIONS.chatMessages).find({ userId }).toArray(),
  ]);

  return {
    profiles,
    life_entries,
    life_entry_links,
    entry_attachments,
    family_people,
    family_relationships,
    chat_threads,
    chat_messages,
  };
}
