"use client";

import { useEffect, useMemo } from "react";
import { Trash2 } from "lucide-react";
import { base64ToBlobUrl, type PendingVoiceNote } from "@/modules/life-story/domain/voice-note";

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
  notes: PendingVoiceNote[];
  onRemove: (index: number) => void;
};

export function PendingVoiceNotesList({ locale, notes, onRemove }: Props) {
  const labels = FIELD_LABELS[locale];
  const urls = useMemo(
    () => notes.map((note) => base64ToBlobUrl(note.fileBase64, note.contentType)),
    [notes],
  );

  useEffect(() => () => {
    urls.forEach((url) => URL.revokeObjectURL(url));
  }, [urls]);

  if (notes.length === 0) return null;

  const t = locale === "es"
    ? {
        heading: "Grabaciones pendientes de guardar",
        intro: "Se subirán cuando guardes la experiencia. Puedes escucharlas o eliminarlas antes.",
        delete: "Quitar grabación",
        deleteConfirm: "¿Quitar esta grabación pendiente? El texto ya añadido al formulario no se borrará.",
      }
    : {
        heading: "Recordings waiting to be saved",
        intro: "They will upload when you save the experience. You can listen or remove them first.",
        delete: "Remove recording",
        deleteConfirm: "Remove this pending recording? Text already added to the form will stay.",
      };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-[var(--ink)]">{t.heading}</h3>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{t.intro}</p>
      </div>
      <ul className="space-y-3">
        {notes.map((note, index) => {
          const fieldLabel = note.fieldKey in labels ? labels[note.fieldKey] : labels.other;
          return (
            <li key={`${note.fileName}-${index}`} className="rounded-xl border border-dashed border-[var(--line)] bg-[#fcfdf9] p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--moss)]">{fieldLabel}</p>
                <button
                  type="button"
                  className="btn btn-quiet !p-2 text-[var(--danger)]"
                  aria-label={t.delete}
                  onClick={() => {
                    if (!window.confirm(t.deleteConfirm)) return;
                    onRemove(index);
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <audio className="mt-3 w-full" controls preload="metadata" src={urls[index]} />
              {note.transcript && (
                <p className="mt-2 text-sm leading-6 text-[var(--ink)]">{note.transcript}</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
