"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { SquarePen } from "lucide-react";
import { deleteReflectionConversationAction } from "../../application/reflection-actions";
import type { ReflectionConversation } from "../../domain/reflection-conversation";
import { reflectionCopy } from "../../domain/reflection-copy";
import { clearReflectionThread, noteReflectionNavigation } from "../reflection-live-session";
import { ConfirmDialog } from "@/modules/life-story/presentation/components/confirm-dialog";
import { ReflectionConversationRow } from "./reflection-conversation-row";
import { useReflectionShell } from "./reflection-shell";

export function ReflectionSidebar({
  locale,
  onNavigate,
}: {
  locale: "es" | "en";
  onNavigate?: () => void;
}) {
  const copy = reflectionCopy(locale);
  const pathname = usePathname();
  const router = useRouter();
  const shell = useReflectionShell();
  const [pendingDelete, setPendingDelete] = useState<ReflectionConversation | null>(null);
  const [error, setError] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const newChatHref = `/${locale}/app/reflect` as Route;
  const newChatActive = pathname === newChatHref;

  function openConversation() {
    noteReflectionNavigation();
    onNavigate?.();
  }

  async function confirmDelete() {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    setError(undefined);
    const result = await deleteReflectionConversationAction(locale, pendingDelete.id);
    setDeleting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const removedId = pendingDelete.id;
    const active = pathname === `/${locale}/app/reflect/${removedId}`;
    shell.removeConversation(removedId);
    clearReflectionThread(removedId);
    setPendingDelete(null);
    if (active) {
      noteReflectionNavigation();
      router.push(newChatHref);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--paper)]">
      <div className="border-b border-[var(--line)] p-3">
        <Link href={newChatHref} onClick={openConversation} className={`btn w-full ${newChatActive ? "btn-primary" : "btn-secondary"}`}>
          <SquarePen size={16} />
          {copy.newChat}
        </Link>
      </div>
      <nav aria-label={copy.conversations} className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {shell.conversations.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm leading-6 text-[var(--muted)]">{copy.emptyList}</p>
        ) : shell.conversations.map((conversation) => (
          <ReflectionConversationRow
            key={conversation.id}
            locale={locale}
            conversation={conversation}
            active={pathname === `/${locale}/app/reflect/${conversation.id}`}
            onOpen={openConversation}
            onDelete={setPendingDelete}
          />
        ))}
      </nav>
      {error && <p className="field-error px-3 pb-3">{error}</p>}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={copy.deleteTitle}
        body={copy.deleteBody}
        cancelLabel={copy.cancel}
        onClose={() => { if (!deleting) setPendingDelete(null); }}
        actions={[{
          label: copy.delete,
          variant: "danger",
          onClick: () => { void confirmDelete(); },
        }]}
      />
    </div>
  );
}
