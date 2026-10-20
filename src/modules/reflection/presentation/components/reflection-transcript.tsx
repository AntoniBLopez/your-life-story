"use client";

import { useEffect, useRef } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import type { ReflectionMessage } from "../../domain/reflection-conversation";

export function ReflectionTranscript({
  messages,
  empty,
}: {
  messages: ReflectionMessage[];
  empty: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const last = messages.at(-1);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, last?.content]);

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[var(--cream)] p-4 sm:p-6">
      {messages.length === 0 ? (
        <div className="grid min-h-48 place-items-center text-center">
          <div>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--sage)] text-[var(--moss)]">
              <Sparkles size={20} />
            </span>
            <p className="mt-4 max-w-sm text-sm text-[var(--muted)]">{empty}</p>
          </div>
        </div>
      ) : messages.map((item) => (
        <div key={item.id} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[86%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${item.role === "user" ? "bg-[var(--moss-deep)] text-white" : "bg-[var(--sage)] text-[var(--ink)]"}`}>
            {item.content || <LoaderCircle size={15} className="animate-spin" aria-hidden />}
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
