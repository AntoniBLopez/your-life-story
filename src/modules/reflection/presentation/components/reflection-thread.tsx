"use client";

import { PanelLeft } from "lucide-react";
import type { ReflectionMessage } from "../../domain/reflection-conversation";
import { reflectionCopy } from "../../domain/reflection-copy";
import { useReflectionThread } from "../hooks/use-reflection-thread";
import { ReflectionComposer } from "./reflection-composer";
import { useReflectionShell } from "./reflection-shell";
import { ReflectionTranscript } from "./reflection-transcript";

export function ReflectionThread({
  locale,
  chatId,
  initialMessages,
}: {
  locale: "es" | "en";
  chatId: string | null;
  initialMessages: ReflectionMessage[];
}) {
  const copy = reflectionCopy(locale);
  const shell = useReflectionShell();
  const thread = useReflectionThread({ locale, chatId, initialMessages });
  const title = chatId
    ? shell.conversations.find((item) => item.id === chatId)?.title ?? copy.conversations
    : copy.newChat;

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-label={title}>
      <header className="flex items-center gap-2 border-b border-[var(--line)] bg-[var(--paper)] px-2 py-2 sm:px-3">
        <button type="button" className="btn btn-quiet !p-2 md:hidden" aria-label={copy.openSidebar} onClick={shell.openSidebar}>
          <PanelLeft size={18} />
        </button>
        <button
          type="button"
          className="btn btn-quiet !hidden !p-2 md:!inline-flex"
          aria-label={copy.conversations}
          aria-pressed={shell.desktopOpen}
          onClick={shell.openSidebar}
        >
          <PanelLeft size={18} />
        </button>
        <h2 className="min-w-0 truncate text-sm font-bold text-[var(--ink)]">{title}</h2>
      </header>
      <ReflectionTranscript messages={thread.messages} empty={copy.empty} />
      <ReflectionComposer
        value={thread.draft}
        placeholder={copy.placeholder}
        sendLabel={copy.send}
        disclaimer={copy.disclaimer}
        error={thread.error}
        sending={thread.streaming}
        onChange={thread.setDraft}
        onSend={thread.send}
      />
    </section>
  );
}
