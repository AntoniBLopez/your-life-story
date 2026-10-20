"use client";

import { useRef, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { readReflectionConversationAction } from "../../application/reflection-actions";
import type { ReflectionMessage } from "../../domain/reflection-conversation";
import { reflectionCopy } from "../../domain/reflection-copy";
import {
  getReflectionLive,
  getServerReflectionLive,
  streamReflectionReply,
  subscribeReflectionLive,
} from "../reflection-live-session";
import { useReflectionShell } from "../components/reflection-shell";

export function useReflectionThread({
  locale,
  chatId,
  initialMessages,
}: {
  locale: "es" | "en";
  chatId: string | null;
  initialMessages: ReflectionMessage[];
}) {
  const router = useRouter();
  const copy = reflectionCopy(locale);
  const shell = useReflectionShell();
  const live = useSyncExternalStore(subscribeReflectionLive, getReflectionLive, getServerReflectionLive);
  const [draft, setDraft] = useState("");
  const sendingRef = useRef(false);
  const liveThread = chatId
    ? live.threads[chatId] ?? null
    : live.draft ?? (live.draftChatId ? live.threads[live.draftChatId] ?? null : null);
  const messages = liveThread?.messages ?? (chatId ? initialMessages : []);
  const streaming = liveThread?.streaming ?? false;

  async function send(content: string) {
    const text = content.trim();
    if (!text || streaming || sendingRef.current) return;
    sendingRef.current = true;
    setDraft("");
    if (chatId) shell.touchConversation(chatId);
    try {
      const resultId = await streamReflectionReply({
        locale,
        chatId,
        history: messages,
        content: text,
        errorText: copy.sendError,
        onChatReady(chat, navigate) {
          const now = new Date().toISOString();
          shell.upsertConversation({
            id: chat.id,
            title: chat.title || copy.newChat,
            titleSource: "derived",
            createdAt: now,
            updatedAt: now,
          });
          if (navigate) router.replace(`/${locale}/app/reflect/${chat.id}` as Route);
        },
      });
      if (!resultId) return;
      const summary = await readReflectionConversationAction(resultId);
      if (summary.ok) shell.upsertConversation(summary.data);
    } finally {
      sendingRef.current = false;
    }
  }

  return {
    messages,
    streaming,
    error: liveThread?.error,
    draft,
    setDraft,
    send,
  };
}
