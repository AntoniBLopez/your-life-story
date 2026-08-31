"use client";

import { useMemo, useState, useTransition } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { deleteAttachmentAction } from "@/modules/life-story/application/life-entry-actions";
import type { AttachmentRecord } from "@/shared/lib/mongodb/attachments";
import { AUDIO_CONTENT_TYPES } from "@/modules/life-story/domain/voice-note";

const FIELD_LABELS = {
  es: {
    title: "Título",
    narrative: "Qué ocurrió",
    difficulty: "Qué fue difícil",
    learning: "Qué aprendiste",
    transformation: "Qué cambió",
    full: "Experiencia completa",
    other: "Nota de voz",
  },
  en: {
    title: "Title",
    narrative: "What happened",
    difficulty: "What was hard",
    learning: "What you learned",
    transformation: "What changed",
    full: "Full experience",
    other: "Voice note",
  },
} as const;

type Props = {
  locale: "es" | "en";
  entryId?: string;
  attachments: AttachmentRecord[];
  readOnly?: boolean;
  onDeleted?: () => void;
  onError?: (message: string) => void;
};

function formatDate(value: Date | string, locale: "es" | "en") {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function VoiceAttachmentsList({ locale, entryId, attachments, readOnly, onDeleted, onError }: Props) {
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string>();

  const voiceNotes = useMemo(
    () => attachments
      .filter((item) => AUDIO_CONTENT_TYPES.includes(item.mimeType as (typeof AUDIO_CONTENT_TYPES)[number]))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [attachments],
  );

  const t = locale === "es"
    ? {
        heading: "Tu voz en esta experiencia",
        intro: "Cada grabación conserva tu tono, ritmo y energía. Puedes escucharla cuando quieras o eliminar solo el audio; el texto transcrito en el formulario no se borra.",
        delete: "Eliminar audio",
        deleteConfirm: "¿Eliminar solo este audio? El texto que ya transcribimos en el formulario se mantendrá.",
        transcript: "Transcripción de esta grabación",
      }
    : {
        heading: "Your voice in this experience",
        intro: "Each recording keeps your tone, pace and energy. Listen anytime or delete just the audio; transcribed text in the form stays.",
        delete: "Delete audio",
        deleteConfirm: "Delete only this audio? Transcribed text already in the form will be kept.",
        transcript: "Transcript of this recording",
      };

  if (voiceNotes.length === 0) return null;

  const labels = FIELD_LABELS[locale];

  function remove(attachmentId: string) {
    if (!entryId || readOnly) return;
    if (!window.confirm(t.deleteConfirm)) return;
    setDeletingId(attachmentId);
    startTransition(async () => {
      const result = await deleteAttachmentAction(attachmentId, entryId, locale);
      setDeletingId(undefined);
      if (!result.ok) onError?.(result.error);
      else onDeleted?.();
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-[var(--ink)]">{t.heading}</h3>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{t.intro}</p>
      </div>
      <ul className="space-y-3">
        {voiceNotes.map((note) => {
          const fieldLabel = note.fieldKey && note.fieldKey in labels
            ? labels[note.fieldKey as keyof typeof labels]
            : labels.other;
          const isDeleting = deletingId === note.id;
          return (
            <li key={note.id} className="rounded-xl border border-[var(--line)] bg-[#fcfdf9] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--moss)]">{fieldLabel}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{formatDate(note.createdAt, locale)}</p>
                </div>
                <button
                  type="button"
                  className="btn btn-quiet !p-2 text-[var(--danger)]"
                  disabled={pending || readOnly || !entryId}
                  aria-label={t.delete}
                  onClick={() => remove(note.id)}
                >
                  {isDeleting ? <LoaderCircle className="animate-spin" size={15} /> : <Trash2 size={15} />}
                </button>
              </div>
              <audio className="mt-3 w-full" controls preload="metadata" src={`/api/attachments/${note.id}`} />
              {note.transcript && (
                <div className="mt-3 rounded-lg bg-[#f4f7f2] p-3">
                  <p className="text-xs font-medium text-[var(--muted)]">{t.transcript}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--ink)]">{note.transcript}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
