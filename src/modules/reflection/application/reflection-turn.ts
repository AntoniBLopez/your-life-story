import { listLifeEntriesForUser } from "@/modules/life-story/application/life-story-service";
import { isAiConfigured } from "@/shared/lib/ai-providers";
import { buildReflectionContext } from "./reflection-context";
import { reflectionRepository } from "./reflection-repository";
import type { ReflectionChatRequest } from "./reflection-schemas";
import { suggestReflectionTitle } from "./reflection-title-service";
import { buildReflectionPrompt } from "../domain/reflection-prompt";
import {
  canAutotitle,
  deriveConversationTitle,
  REFLECTION_HISTORY_LIMIT,
} from "../domain/reflection-conversation";
import { crisisSupportMessage, requiresImmediateSupport } from "../domain/reflection-policy";

export type ReflectionTurn =
  | { type: "rejected"; status: number; error: string }
  | { type: "crisis"; chatId: string; title: string; response: string }
  | { type: "unavailable"; chatId: string; title: string; error: string }
  | { type: "stream"; chatId: string; title: string; locale: "es" | "en"; instructions: string; message: string };

export async function beginReflectionTurn(userId: string, input: ReflectionChatRequest): Promise<ReflectionTurn> {
  const consented = await reflectionRepository.hasAiConsent(userId);
  if (!consented) return { type: "rejected", status: 403, error: "AI consent required" };

  const existing = input.chatId
    ? await reflectionRepository.findConversation(userId, input.chatId)
    : null;
  if (input.chatId && !existing) return { type: "rejected", status: 404, error: "Conversation not found" };

  const conversation = existing ?? await reflectionRepository.createConversation(
    userId,
    deriveConversationTitle(input.message, input.locale),
  );

  const [previous, entries] = await Promise.all([
    reflectionRepository.listMessages(userId, conversation.id, REFLECTION_HISTORY_LIMIT),
    listLifeEntriesForUser(userId),
  ]);
  const saved = await reflectionRepository.appendMessage(userId, conversation.id, "user", input.message);
  if (!saved) return { type: "rejected", status: 404, error: "Conversation not found" };

  if (requiresImmediateSupport(input.message)) {
    const response = crisisSupportMessage(input.locale);
    await reflectionRepository.appendMessage(userId, conversation.id, "assistant", response);
    return { type: "crisis", chatId: conversation.id, title: conversation.title, response };
  }

  if (!isAiConfigured()) {
    return { type: "unavailable", chatId: conversation.id, title: conversation.title, error: "No AI API keys are configured" };
  }

  const instructions = buildReflectionPrompt(buildReflectionContext(entries, input.locale), previous);
  return {
    type: "stream",
    chatId: conversation.id,
    title: conversation.title,
    locale: input.locale,
    instructions,
    message: input.message,
  };
}

export async function finishReflectionTurn(userId: string, chatId: string, assistantText: string, locale: "es" | "en") {
  const text = assistantText.trim();
  if (!text) return null;
  const saved = await reflectionRepository.appendMessage(userId, chatId, "assistant", text);
  if (!saved) return null;

  const conversation = await reflectionRepository.findConversation(userId, chatId);
  if (!conversation || !canAutotitle(conversation.titleSource)) return conversation?.title ?? null;

  const messages = await reflectionRepository.listMessages(userId, chatId, REFLECTION_HISTORY_LIMIT);
  const firstUser = messages.find((item) => item.role === "user");
  if (!firstUser) return conversation.title;

  const suggestion = await suggestReflectionTitle({
    locale,
    userMessage: firstUser.content,
    assistantExcerpt: text,
  });
  if (!suggestion) return conversation.title;
  return (await reflectionRepository.replaceDerivedTitle(userId, chatId, suggestion)) ?? conversation.title;
}
