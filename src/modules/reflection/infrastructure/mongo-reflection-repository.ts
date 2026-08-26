import { getDb } from "@/shared/lib/mongodb/client";
import { COLLECTIONS } from "@/shared/lib/mongodb/collections";

type ChatThreadRecord = {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

type ChatMessageRecord = {
  id: string;
  userId: string;
  threadId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
};

export type ChatMessage = { id: string; role: "user" | "assistant"; content: string; createdAt: string };

export async function getReflectionState(userId: string) {
  const db = await getDb();
  const profile = await db.collection(COLLECTIONS.profiles).findOne({ id: userId });
  const thread = await db.collection<ChatThreadRecord>(COLLECTIONS.chatThreads)
    .find({ userId })
    .sort({ createdAt: 1 })
    .limit(1)
    .next();

  if (!thread) {
    return { consented: Boolean(profile?.aiConsentAt), messages: [] as ChatMessage[] };
  }

  const messages = await db.collection<ChatMessageRecord>(COLLECTIONS.chatMessages)
    .find({ userId, threadId: thread.id })
    .sort({ createdAt: 1 })
    .limit(60)
    .toArray();

  return {
    consented: Boolean(profile?.aiConsentAt),
    messages: messages.map((item) => ({
      id: item.id,
      role: item.role,
      content: item.content,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}

export async function ensureReflectionThread(userId: string) {
  const db = await getDb();
  const existing = await db.collection<ChatThreadRecord>(COLLECTIONS.chatThreads)
    .find({ userId })
    .sort({ createdAt: 1 })
    .limit(1)
    .next();
  if (existing) return existing.id;

  const now = new Date();
  const thread: ChatThreadRecord = {
    id: crypto.randomUUID(),
    userId,
    title: "Life reflections",
    createdAt: now,
    updatedAt: now,
  };
  await db.collection(COLLECTIONS.chatThreads).insertOne(thread);
  return thread.id;
}

export async function saveReflectionMessage(userId: string, threadId: string, role: "user" | "assistant", content: string) {
  const db = await getDb();
  const message: ChatMessageRecord = {
    id: crypto.randomUUID(),
    userId,
    threadId,
    role,
    content,
    createdAt: new Date(),
  };
  await db.collection(COLLECTIONS.chatMessages).insertOne(message);
  await db.collection(COLLECTIONS.chatThreads).updateOne({ id: threadId, userId }, { $set: { updatedAt: new Date() } });
}
