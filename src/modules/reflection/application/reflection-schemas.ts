import { z } from "zod";
import {
  isReflectionChatId,
  REFLECTION_MESSAGE_MAX,
  REFLECTION_TITLE_MAX,
} from "../domain/reflection-conversation";

export const reflectionLocaleSchema = z.enum(["es", "en"]);

const chatIdSchema = z.string().refine(isReflectionChatId, "Invalid chat id.");

export const reflectionChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(REFLECTION_MESSAGE_MAX),
  locale: reflectionLocaleSchema,
  chatId: chatIdSchema.optional(),
});

export const renameReflectionConversationSchema = z.object({
  chatId: chatIdSchema,
  title: z.string().trim().min(1).max(REFLECTION_TITLE_MAX),
  locale: reflectionLocaleSchema,
});

export const reflectionChatIdSchema = z.object({
  chatId: chatIdSchema,
  locale: reflectionLocaleSchema,
});

export type ReflectionChatRequest = z.infer<typeof reflectionChatRequestSchema>;
