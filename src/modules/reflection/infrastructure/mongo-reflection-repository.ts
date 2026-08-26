import type { ObjectId } from "mongodb";
import { getDb } from "@/shared/lib/mongodb/client";
import { COLLECTIONS } from "@/shared/lib/mongodb/collections";
import { idFromDocument, toObjectId } from "@/shared/lib/mongodb/id";

type ChatThreadDbRecord = {
  _id: ObjectId;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

type ChatMessageDbRecord = {
  _id: ObjectId;
  userId: string;
  threadId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
};

export type ChatMessage = { id: string; role: "user" | "assistant"; content: string; createdAt: string };

export async function getReflectionState(userId: string) {
  const db = await getDb();
  const profile = await db.collection(COLLECTIONS.profiles).findOne({ userId });
  const thread = await db.collection<ChatThreadDbRecord>(COLLECTIONS.chatThreads)
    .find({ userId })
    .sort({ createdAt: 1 })
    .limit(1)
    .next();

  if (!thread) {
    return { consented: Boolean(profile?.aiConsentAt), messages: [] as ChatMessage[] };
  }

  const threadId = idFromDocument(thread);
  const messages = await db.collection<ChatMessageDbRecord>(COLLECTIONS.chatMessages)
    .find({ userId, threadId })
    .sort({ createdAt: 1 })
    .limit(60)
    .toArray();

  return {
    consented: Boolean(profile?.aiConsentAt),
    messages: messages.map((item) => ({
      id: idFromDocument(item),
      role: item.role,
      content: item.content,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}

export async function ensureReflectionThread(userId: string) {
  const db = await getDb();
  const existing = await db.collection<ChatThreadDbRecord>(COLLECTIONS.chatThreads)
    .find({ userId })
    .sort({ createdAt: 1 })
    .limit(1)
    .next();
  if (existing) return idFromDocument(existing);

  const now = new Date();
  const thread = {
    userId,
    title: "Life reflections",
    createdAt: now,
    updatedAt: now,
  };
  const { insertedId } = await db.collection(COLLECTIONS.chatThreads).insertOne(thread);
  return insertedId.toString();
}

export async function saveReflectionMessage(userId: string, threadId: string, role: "user" | "assistant", content: string) {
  const db = await getDb();
  await db.collection(COLLECTIONS.chatMessages).insertOne({
    userId,
    threadId,
    role,
    content,
    createdAt: new Date(),
  });
  await db.collection(COLLECTIONS.chatThreads).updateOne({ _id: toObjectId(threadId), userId }, { $set: { updatedAt: new Date() } });
}
