import {
  getReflectionState as getMongoReflectionState,
  ensureReflectionThread as ensureMongoReflectionThread,
  saveReflectionMessage as saveMongoReflectionMessage,
  type ChatMessage,
} from "../infrastructure/mongo-reflection-repository";

export type { ChatMessage };

export async function getReflectionState(userId: string) {
  return getMongoReflectionState(userId);
}

export async function ensureReflectionThread(userId: string) {
  return ensureMongoReflectionThread(userId);
}

export async function saveReflectionMessage(userId: string, threadId: string, role: "user" | "assistant", content: string) {
  await saveMongoReflectionMessage(userId, threadId, role, content);
}
