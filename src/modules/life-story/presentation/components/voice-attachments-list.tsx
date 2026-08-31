"use client";

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
  attachments: AttachmentRecord[];
};

export function VoiceAttachmentsList({ locale, attachments }: Props) {
  const voiceNotes = attachments.filter((item) => AUDIO_CONTENT_TYPES.includes(item.mimeType as (typeof AUDIO_CONTENT_TYPES)[number]));
  if (voiceNotes.length === 0) return null;

  const labels = FIELD_LABELS[locale];
  const heading = locale === "es" ? "Notas de voz guardadas" : "Saved voice notes";

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[var(--ink)]">{heading}</h3>
      <ul className="space-y-3">
        {voiceNotes.map((note) => {
          const fieldLabel = note.fieldKey && note.fieldKey in labels
            ? labels[note.fieldKey as keyof typeof labels]
            : labels.other;
          return (
            <li key={note.id} className="rounded-xl border border-[var(--line)] bg-[#fcfdf9] p-3">
              <p className="text-xs font-medium text-[var(--muted)]">{fieldLabel}</p>
              <audio className="mt-2 w-full" controls preload="metadata" src={`/api/attachments/${note.id}`} />
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
