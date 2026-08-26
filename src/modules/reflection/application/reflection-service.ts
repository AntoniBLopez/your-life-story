import { env } from "@/shared/lib/env";
import {
  getReflectionState as getMongoReflectionState,
  ensureReflectionThread as ensureMongoReflectionThread,
  saveReflectionMessage as saveMongoReflectionMessage,
  type ChatMessage,
} from "../infrastructure/mongo-reflection-repository";

export type { ChatMessage };

export async function getReflectionState(userId: string) {
  if (env.demoMode) {
    return {
      consented: true,
      messages: [{
        id: "demo-message-1",
        role: "assistant" as const,
        content: "Este es un espacio de demostración. Puedes explorar la interfaz sin conectar todavía tu cuenta.",
        createdAt: "2024-01-01T00:00:00.000Z",
      }] as ChatMessage[],
    };
  }
  return getMongoReflectionState(userId);
}

export async function ensureReflectionThread(userId: string) {
  if (env.demoMode) return "demo-thread";
  return ensureMongoReflectionThread(userId);
}

export async function saveReflectionMessage(userId: string, threadId: string, role: "user" | "assistant", content: string) {
  if (env.demoMode) return;
  await saveMongoReflectionMessage(userId, threadId, role, content);
}
