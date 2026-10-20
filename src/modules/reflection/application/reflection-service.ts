import {
  normalizeConversationTitle,
  REFLECTION_CONVERSATION_LIMIT,
  REFLECTION_TRANSCRIPT_LIMIT,
  type ReflectionMessage,
} from "../domain/reflection-conversation";
import { reflectionRepository } from "./reflection-repository";

export type { ReflectionMessage as ChatMessage } from "../domain/reflection-conversation";

export async function hasAiConsent(userId: string) {
  return reflectionRepository.hasAiConsent(userId);
}

export async function getReflectionState(userId: string) {
  const consented = await reflectionRepository.hasAiConsent(userId);
  return { consented, messages: [] as ReflectionMessage[] };
}

export async function getReflectionWorkspace(userId: string) {
  const [consented, conversations] = await Promise.all([
    reflectionRepository.hasAiConsent(userId),
    reflectionRepository.listConversations(userId, REFLECTION_CONVERSATION_LIMIT),
  ]);
  return { consented, conversations };
}

export async function getReflectionConversationSummary(userId: string, chatId: string) {
  return reflectionRepository.findConversation(userId, chatId);
}

export async function getReflectionConversation(userId: string, chatId: string) {
  const conversation = await reflectionRepository.findConversation(userId, chatId);
  if (!conversation) return null;
  const messages = await reflectionRepository.listMessages(userId, chatId, REFLECTION_TRANSCRIPT_LIMIT);
  return { ...conversation, messages };
}

export async function renameReflectionConversation(userId: string, chatId: string, title: string) {
  const normalized = normalizeConversationTitle(title);
  if (!normalized) return null;
  return reflectionRepository.renameConversation(userId, chatId, normalized);
}

export async function deleteReflectionConversation(userId: string, chatId: string) {
  return reflectionRepository.deleteConversation(userId, chatId);
}
