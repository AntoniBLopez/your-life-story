"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/shared/lib/auth";
import type { ActionResult } from "@/shared/types/action";
import { upsertProfile, updateProfileFields } from "@/modules/identity/infrastructure/mongo-profile-repository";
import type { ReflectionConversation } from "../domain/reflection-conversation";
import { isReflectionChatId } from "../domain/reflection-conversation";
import { reflectionCopy } from "../domain/reflection-copy";
import { reflectionChatIdSchema, renameReflectionConversationSchema } from "./reflection-schemas";
import {
  deleteReflectionConversation,
  getReflectionConversationSummary,
  renameReflectionConversation,
} from "./reflection-service";

function revalidateReflection(locale: "es" | "en") {
  revalidatePath(`/${locale}/app/reflect`, "layout");
}

export async function grantAiConsentAction(locale: "es" | "en"): Promise<ActionResult> {
  try {
    const user = await requireCurrentUser();
    await upsertProfile(user.id, { aiConsentAt: new Date(), locale });
    revalidateReflection(locale);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : reflectionCopy(locale).actionError };
  }
}

export async function revokeAiConsentAction(locale: "es" | "en"): Promise<ActionResult> {
  try {
    const user = await requireCurrentUser();
    await updateProfileFields(user.id, { aiConsentAt: null });
    revalidateReflection(locale);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : reflectionCopy(locale).actionError };
  }
}

export async function renameReflectionConversationAction(locale: "es" | "en", chatId: string, title: string): Promise<ActionResult<ReflectionConversation>> {
  const copy = reflectionCopy(locale);
  const parsed = renameReflectionConversationSchema.safeParse({ locale, chatId, title });
  if (!parsed.success) return { ok: false, error: copy.validation };
  try {
    const user = await requireCurrentUser();
    const conversation = await renameReflectionConversation(user.id, parsed.data.chatId, parsed.data.title);
    if (!conversation) return { ok: false, error: copy.notFound };
    revalidateReflection(locale);
    return { ok: true, data: conversation };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : copy.actionError };
  }
}

export async function deleteReflectionConversationAction(locale: "es" | "en", chatId: string): Promise<ActionResult> {
  const copy = reflectionCopy(locale);
  const parsed = reflectionChatIdSchema.safeParse({ locale, chatId });
  if (!parsed.success) return { ok: false, error: copy.validation };
  try {
    const user = await requireCurrentUser();
    const deleted = await deleteReflectionConversation(user.id, parsed.data.chatId);
    if (!deleted) return { ok: false, error: copy.notFound };
    revalidateReflection(locale);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : copy.actionError };
  }
}

export async function readReflectionConversationAction(chatId: string): Promise<ActionResult<ReflectionConversation>> {
  if (!isReflectionChatId(chatId)) return { ok: false, error: "Conversation not found" };
  try {
    const user = await requireCurrentUser();
    const conversation = await getReflectionConversationSummary(user.id, chatId);
    if (!conversation) return { ok: false, error: "Conversation not found" };
    return { ok: true, data: conversation };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Conversation not found" };
  }
}
