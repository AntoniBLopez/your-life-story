"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteLifeEntryAction } from "@/modules/life-story/application/life-entry-actions";

export function DeleteEntryButton({ entryId, locale }: { entryId: string; locale: "es" | "en" }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const copy = locale === "es" ? "¿Borrar esta experiencia y sus archivos? Esta acción no se puede deshacer." : "Delete this experience and its files? This cannot be undone.";
  return <span><button type="button" disabled={pending} className="btn btn-quiet !p-2 text-[var(--danger)]" aria-label={locale === "es" ? "Borrar experiencia" : "Delete experience"} onClick={() => { if (!window.confirm(copy)) return; startTransition(async () => { const result = await deleteLifeEntryAction(entryId, locale); if (!result.ok) setError(result.error); }); }}><Trash2 size={15} /></button>{error && <small className="block text-[10px] text-[var(--danger)]">{error}</small>}</span>;
}
