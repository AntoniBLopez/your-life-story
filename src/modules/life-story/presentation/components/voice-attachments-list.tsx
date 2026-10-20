"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { FileAudio, LoaderCircle, Trash2 } from "lucide-react";
import { deleteAttachmentAction } from "@/modules/life-story/application/life-entry-actions";
import type { AttachmentRecord } from "@/shared/lib/mongodb/attachments";
import { AUDIO_CONTENT_TYPES, VOICE_FIELD_KEYS, type VoiceFieldKey } from "@/modules/life-story/domain/voice-note";
import { transcribeSavedAudio } from "@/modules/life-story/presentation/transcribe-saved-audio";
import { voiceStageLabel, type VoiceStage } from "@/modules/life-story/presentation/voice-pipeline";
import { takeAutoTranscription, type AutoTranscribeItem } from "@/modules/life-story/presentation/voice-session-queue";

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

const TRANSCRIPT_PREVIEW_CHARS = 600;

type Props = {
  locale: "es" | "en";
  entryId?: string;
  attachments: AttachmentRecord[];
  readOnly?: boolean;
  onDeleted?: () => void;
  onError?: (message: string) => void;
  /** A saved audio finished transcribing (transcript may be empty for silence); `fieldKey` is the field it was recorded for. */
  onTranscribed?: (fieldKey: VoiceFieldKey | null, transcript: string) => void;
};

type JobView = { stage: VoiceStage | null; error?: string };

function formatDate(value: Date | string, locale: "es" | "en") {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function asFieldKey(value: string | null): VoiceFieldKey | null {
  return value && (VOICE_FIELD_KEYS as readonly string[]).includes(value) ? (value as VoiceFieldKey) : null;
}

export function VoiceAttachmentsList({ locale, entryId, attachments, readOnly, onDeleted, onError, onTranscribed }: Props) {
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string>();
  const [jobs, setJobs] = useState<Record<string, JobView>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const runningRef = useRef(false);

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
        transcribe: "Transcribir",
        resume: "Continuar transcripción",
        partial: (done: number, total: number) => `Transcripción a medias: ${done} de ${total} partes hechas.`,
        showAll: "Ver todo",
        showLess: "Ver menos",
        starting: "Preparando la transcripción…",
      }
    : {
        heading: "Your voice in this experience",
        intro: "Each recording keeps your tone, pace and energy. Listen anytime or delete just the audio; transcribed text in the form stays.",
        delete: "Delete audio",
        deleteConfirm: "Delete only this audio? Transcribed text already in the form will be kept.",
        transcript: "Transcript of this recording",
        transcribe: "Transcribe",
        resume: "Continue transcription",
        partial: (done: number, total: number) => `Transcription half done: ${done} of ${total} parts.`,
        showAll: "Show all",
        showLess: "Show less",
        starting: "Preparing the transcription…",
      };

  async function runTranscription(note: Pick<AttachmentRecord, "id" | "fieldKey">, options: { deleteAfter?: boolean } = {}) {
    if (!entryId || readOnly || runningRef.current) return false;
    runningRef.current = true;
    setJobs((current) => ({ ...current, [note.id]: { stage: null } }));
    try {
      const result = await transcribeSavedAudio({
        attachmentId: note.id,
        locale,
        onProgress: (event) => setJobs((current) => ({
          ...current,
          [note.id]: {
            stage: event.phase === "waiting"
              ? { kind: "waiting", done: event.done, total: event.total, resumeAt: event.resumeAt }
              : { kind: "transcribing", done: event.done, total: event.total },
          },
        })),
      });
      if (!result.ok) {
        setJobs((current) => ({ ...current, [note.id]: { stage: null, error: result.error } }));
        return false;
      }
      setJobs((current) => {
        const next = { ...current };
        delete next[note.id];
        return next;
      });
      if (options.deleteAfter) await deleteAttachmentAction(note.id, entryId, locale);
      onTranscribed?.(asFieldKey(note.fieldKey), result.transcript);
      return true;
    } finally {
      runningRef.current = false;
    }
  }

  // Long audios uploaded together with a new experience are transcribed on arrival.
  useEffect(() => {
    if (!entryId || readOnly) return;
    const queued: AutoTranscribeItem[] = takeAutoTranscription(entryId);
    if (queued.length === 0) return;
    void (async () => {
      for (const item of queued) {
        await runTranscription({ id: item.attachmentId, fieldKey: item.fieldKey ?? null }, { deleteAfter: item.deleteAfterTranscription });
      }
    })();
    // Runs once per experience.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId, readOnly]);

  if (voiceNotes.length === 0) return null;

  const labels = FIELD_LABELS[locale];
  const anyRunning = Object.values(jobs).some((job) => !job.error);

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
          const job = jobs[note.id];
          const isRunning = Boolean(job && !job.error);
          const progress = note.transcriptionProgress;
          const transcript = note.transcript ?? "";
          const isLong = transcript.length > TRANSCRIPT_PREVIEW_CHARS;
          const showAll = expanded[note.id] ?? false;
          return (
            <li key={note.id} className="rounded-xl border border-[var(--line)] bg-[#fcfdf9] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--moss)]">{fieldLabel}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{formatDate(note.createdAt, locale)} · {formatSize(note.sizeBytes)}</p>
                </div>
                <button
                  type="button"
                  className="btn btn-quiet !p-2 text-[var(--danger)]"
                  disabled={pending || readOnly || !entryId || isRunning}
                  aria-label={t.delete}
                  onClick={() => remove(note.id)}
                >
                  {isDeleting ? <LoaderCircle className="animate-spin" size={15} /> : <Trash2 size={15} />}
                </button>
              </div>
              <audio className="mt-3 w-full" controls preload="metadata" src={`/api/attachments/${note.id}`} />
              {transcript ? (
                <div className="mt-3 rounded-lg bg-[#f4f7f2] p-3">
                  <p className="text-xs font-medium text-[var(--muted)]">{t.transcript}</p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[var(--ink)]">
                    {isLong && !showAll ? `${transcript.slice(0, TRANSCRIPT_PREVIEW_CHARS).trimEnd()}…` : transcript}
                  </p>
                  {isLong && (
                    <button type="button" className="mt-1 text-xs font-medium text-[var(--moss-deep)] underline" onClick={() => setExpanded((current) => ({ ...current, [note.id]: !showAll }))}>
                      {showAll ? t.showLess : t.showAll}
                    </button>
                  )}
                </div>
              ) : !readOnly && entryId && (
                <div className="mt-3 space-y-2">
                  {progress && !isRunning && <p className="text-xs text-[var(--muted)]">{t.partial(progress.done, progress.total)}</p>}
                  {isRunning ? (
                    <div role="status" className="space-y-1.5">
                      <p className="flex items-center gap-2 text-sm text-[var(--muted)]">
                        <LoaderCircle className="animate-spin" size={14} />
                        {voiceStageLabel(job?.stage ?? null, locale) ?? t.starting}
                      </p>
                      {job?.stage && job.stage.kind !== "saving" && job.stage.total > 1 && (
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e3eadf]">
                          <div className="h-full bg-[var(--moss)] transition-all" style={{ width: `${Math.round((job.stage.done / job.stage.total) * 100)}%` }} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary text-xs !px-3 !py-1.5"
                      disabled={anyRunning || pending}
                      onClick={() => void runTranscription(note)}
                    >
                      <FileAudio size={14} />
                      {progress || job?.error ? t.resume : t.transcribe}
                    </button>
                  )}
                  {job?.error && <p role="alert" className="text-sm text-[var(--danger)]">{job.error}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
