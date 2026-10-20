"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { renameReflectionConversationAction } from "../../application/reflection-actions";
import type { ReflectionConversation } from "../../domain/reflection-conversation";
import { formatReflectionTime, reflectionCopy } from "../../domain/reflection-copy";
import { useReflectionShell } from "./reflection-shell";

export function ReflectionConversationRow({
  locale,
  conversation,
  active,
  onOpen,
  onDelete,
}: {
  locale: "es" | "en";
  conversation: ReflectionConversation;
  active: boolean;
  onOpen: () => void;
  onDelete: (conversation: ReflectionConversation) => void;
}) {
  const copy = reflectionCopy(locale);
  const shell = useReflectionShell();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(conversation.title);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const href = `/${locale}/app/reflect/${conversation.id}` as Route;

  async function save() {
    const next = title.trim();
    if (!next || saving) return;
    setSaving(true);
    setError(undefined);
    const result = await renameReflectionConversationAction(locale, conversation.id, next);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    shell.upsertConversation(result.data);
    setEditing(false);
  }

  if (editing) {
    return (
      <form
        className="rounded-xl bg-[var(--sage)] p-2"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <label className="sr-only" htmlFor={`rename-${conversation.id}`}>{copy.renameTitle}</label>
        <input
          id={`rename-${conversation.id}`}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={80}
          className="input !py-2 !text-sm"
          autoFocus
          onKeyDown={(event) => {
            if (event.key === "Escape") setEditing(false);
          }}
        />
        {error && <p className="field-error">{error}</p>}
        <div className="mt-2 flex justify-end gap-1">
          <button type="button" className="btn btn-quiet !px-2 !py-1" aria-label={copy.cancel} onClick={() => setEditing(false)}>
            <X size={14} />
          </button>
          <button type="submit" className="btn btn-primary !px-2 !py-1" aria-label={copy.save} disabled={saving || !title.trim()}>
            <Check size={14} />
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className={`group flex items-start gap-1 rounded-xl pr-1 ${active ? "bg-[var(--sage)]" : "hover:bg-[var(--row-hover)]"}`}>
      <Link href={href} onClick={onOpen} aria-current={active ? "page" : undefined} className="min-w-0 flex-1 px-3 py-2">
        <span className="block truncate text-sm font-bold text-[var(--ink)]">{conversation.title}</span>
        <span className="mt-0.5 block text-[11px] text-[var(--muted)]">{formatReflectionTime(conversation.updatedAt, locale)}</span>
      </Link>
      <div className="flex shrink-0 pt-1 opacity-100 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        <button
          type="button"
          className="btn btn-quiet !p-2"
          aria-label={copy.rename}
          onClick={() => {
            setTitle(conversation.title);
            setError(undefined);
            setEditing(true);
          }}
        >
          <Pencil size={14} />
        </button>
        <button type="button" className="btn btn-quiet !p-2" aria-label={copy.delete} onClick={() => onDelete(conversation)}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
