"use client";

import type { ReflectionMessage } from "../domain/reflection-conversation";

export type LiveThread = {
  messages: ReflectionMessage[];
  streaming: boolean;
  error: string | null;
};

type LiveState = {
  threads: Record<string, LiveThread>;
  draft: LiveThread | null;
  draftChatId: string | null;
};

const EMPTY: LiveState = { threads: {}, draft: null, draftChatId: null };
let state: LiveState = EMPTY;
let navigationGeneration = 0;
const listeners = new Set<() => void>();

export function subscribeReflectionLive(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getReflectionLive() {
  return state;
}

export function getServerReflectionLive() {
  return EMPTY;
}

function commit(recipe: (current: LiveState) => LiveState) {
  state = recipe(state);
  listeners.forEach((listener) => listener());
}

function localMessage(role: ReflectionMessage["role"], content: string): ReflectionMessage {
  return {
    id: `local-${role}-${crypto.randomUUID()}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

export function noteReflectionNavigation() {
  navigationGeneration += 1;
  commit((current) => ({ ...current, draft: null, draftChatId: null }));
}

export function clearReflectionThread(chatId: string) {
  commit((current) => {
    if (!current.threads[chatId] && current.draftChatId !== chatId) return current;
    const threads = { ...current.threads };
    delete threads[chatId];
    return {
      threads,
      draft: current.draftChatId === chatId ? null : current.draft,
      draftChatId: current.draftChatId === chatId ? null : current.draftChatId,
    };
  });
}

function decodeTitle(value: string | null) {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function streamReflectionReply(input: {
  locale: "es" | "en";
  chatId: string | null;
  history: ReflectionMessage[];
  content: string;
  errorText: string;
  onChatReady: (chat: { id: string; title: string }, navigate: boolean) => void;
}) {
  const generation = navigationGeneration;
  const userMessage = localMessage("user", input.content);
  const assistantMessage = localMessage("assistant", "");
  let assistantContent = "";
  const seeded = (): LiveThread => ({
    messages: [...input.history, userMessage, { ...assistantMessage, content: assistantContent }],
    streaming: true,
    error: null,
  });

  let activeId = input.chatId;
  if (activeId) {
    const chatId = activeId;
    commit((current) => ({ ...current, threads: { ...current.threads, [chatId]: seeded() } }));
  } else {
    commit((current) => ({ ...current, draft: seeded(), draftChatId: null }));
  }

  const writeAssistant = (content: string, extras?: Partial<LiveThread>) => {
    assistantContent = content;
    commit((current) => {
      const id = activeId;
      if (id && current.threads[id]) {
        const thread = current.threads[id];
        return {
          ...current,
          threads: {
            ...current.threads,
            [id]: {
              ...thread,
              ...extras,
              messages: thread.messages.map((item) => item.id === assistantMessage.id ? { ...item, content } : item),
            },
          },
        };
      }
      if (!activeId && current.draft) {
        return {
          ...current,
          draft: {
            ...current.draft,
            ...extras,
            messages: current.draft.messages.map((item) => item.id === assistantMessage.id ? { ...item, content } : item),
          },
        };
      }
      return current;
    });
  };

  const publishCreated = (chatId: string, title: string) => {
    const navigate = generation === navigationGeneration;
    activeId = chatId;
    commit((current) => ({
      ...current,
      draft: navigate ? null : current.draft,
      draftChatId: navigate ? chatId : current.draftChatId,
      threads: {
        ...current.threads,
        [chatId]: current.threads[chatId] ?? current.draft ?? seeded(),
      },
    }));
    input.onChatReady({ id: chatId, title: title || seeded().messages[0]?.content || "" }, navigate);
  };

  try {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: input.content,
        locale: input.locale,
        ...(input.chatId ? { chatId: input.chatId } : {}),
      }),
    });
    const createdId = response.headers.get("x-reflection-chat-id");
    const createdTitle = decodeTitle(response.headers.get("x-reflection-chat-title"));
    if (!input.chatId && createdId) publishCreated(createdId, createdTitle);

    if (!response.ok || !response.body) {
      writeAssistant(input.errorText, { streaming: false, error: input.errorText });
      return createdId ?? input.chatId;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let received = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += decoder.decode(value, { stream: true });
      writeAssistant(received);
    }
    writeAssistant(received, { streaming: false, error: null });
    return input.chatId ?? createdId;
  } catch {
    writeAssistant(input.errorText, { streaming: false, error: input.errorText });
    return input.chatId ?? state.draftChatId;
  }
}
