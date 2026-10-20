"use client";

import { useEffect, useState } from "react";
import { Download, LifeBuoy, LoaderCircle, Trash2 } from "lucide-react";
import { mimeTypeToExtension, normalizeAudioContentType, VOICE_FIELD_KEYS, type VoiceFieldKey } from "@/modules/life-story/domain/voice-note";
import {
  deleteRecordingBackup,
  listRecordingBackups,
  loadRecordingBlob,
  type RecordingBackup,
} from "@/modules/life-story/presentation/recording-backup";
import { formatRecordingTime } from "@/modules/life-story/presentation/use-long-recorder";
import { takeVoiceNotice } from "@/modules/life-story/presentation/voice-session-queue";

type Props = {
  locale: "es" | "en";
  entryId?: string;
  /** Ids of backups already shown as pending notes in this form (not orphans). */
  excludeIds: string[];
  /** Hands the recovered audio to the normal save + transcribe flow. */
  onRecover: (recording: { blob: Blob; mimeType: string; fieldKey: VoiceFieldKey; backupId: string; fileName: string }) => Promise<void>;
};

/** Recordings left in this browser (closed tab, crash, failed upload) that never reached the server. */
export function RecordingRecovery({ locale, entryId, excludeIds, onRecover }: Props) {
  const [backups, setBackups] = useState<RecordingBackup[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    void listRecordingBackups().then((items) => {
      if (cancelled) return;
      setBackups(items);
      if (entryId) setNotice(takeVoiceNotice(entryId));
    });
    return () => {
      cancelled = true;
    };
  }, [entryId]);

  const visible = backups.filter((item) => !excludeIds.includes(item.id));
  if (visible.length === 0 && !notice) return null;

  const t = locale === "es"
    ? {
        title: "Grabaciones sin guardar",
        body: "Estas grabaciones se quedaron en este navegador sin llegar a guardarse. Recupéralas para guardarlas y transcribirlas en esta experiencia.",
        recover: "Recuperar",
        download: "Descargar",
        discard: "Descartar",
        discardConfirm: "¿Descartar esta grabación? Se borrará de este navegador y no se podrá recuperar.",
        approx: "aprox.",
        unreadable: "No se pudo leer la grabación guardada en el navegador.",
      }
    : {
        title: "Unsaved recordings",
        body: "These recordings stayed in this browser without being saved. Recover them to save and transcribe them in this experience.",
        recover: "Recover",
        download: "Download",
        discard: "Discard",
        discardConfirm: "Discard this recording? It will be deleted from this browser and can't be recovered.",
        approx: "approx.",
        unreadable: "Could not read the recording stored in the browser.",
      };

  function describe(item: RecordingBackup) {
    const started = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.startedAt));
    const seconds = Math.max(1, Math.round((item.updatedAt - item.startedAt) / 1000));
    return `${started} · ${t.approx} ${formatRecordingTime(seconds)} · ${(item.bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function recover(item: RecordingBackup) {
    setBusyId(item.id);
    try {
      const blob = await loadRecordingBlob(item.id);
      if (!blob) {
        window.alert(t.unreadable);
        return;
      }
      const fieldKey = (VOICE_FIELD_KEYS as readonly string[]).includes(item.fieldKey) ? (item.fieldKey as VoiceFieldKey) : "narrative";
      const contentType = normalizeAudioContentType(item.mimeType);
      setBackups((current) => current.filter((backup) => backup.id !== item.id));
      await onRecover({ blob, mimeType: item.mimeType, fieldKey, backupId: item.id, fileName: `${fieldKey}-${item.startedAt}.${mimeTypeToExtension(contentType)}` });
    } finally {
      setBusyId(undefined);
    }
  }

  async function download(item: RecordingBackup) {
    const blob = await loadRecordingBlob(item.id);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `grabacion-${item.startedAt}.${mimeTypeToExtension(item.mimeType)}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  async function discard(item: RecordingBackup) {
    if (!window.confirm(t.discardConfirm)) return;
    await deleteRecordingBackup(item.id);
    setBackups((current) => current.filter((backup) => backup.id !== item.id));
  }

  return (
    <div role="region" aria-label={t.title} className="rounded-2xl border border-[#e8d9b5] bg-[#fdf8ec] p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]"><LifeBuoy size={16} />{t.title}</p>
      {notice && <p role="alert" className="mt-1 text-sm leading-6 text-[var(--danger)]">{notice}</p>}
      {visible.length > 0 && <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{t.body}</p>}
      <ul className="mt-3 space-y-2">
        {visible.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-white/70 p-3">
            <span className="text-sm text-[var(--ink)]">{describe(item)}</span>
            <span className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary text-xs !px-3 !py-1.5" disabled={Boolean(busyId)} onClick={() => void recover(item)}>
                {busyId === item.id ? <LoaderCircle className="animate-spin" size={14} /> : <LifeBuoy size={14} />}
                {t.recover}
              </button>
              <button type="button" className="btn btn-secondary text-xs !px-3 !py-1.5" disabled={Boolean(busyId)} onClick={() => void download(item)}>
                <Download size={14} />
                {t.download}
              </button>
              <button type="button" className="btn btn-quiet text-xs !px-3 !py-1.5 text-[var(--danger)]" disabled={Boolean(busyId)} onClick={() => void discard(item)}>
                <Trash2 size={14} />
                {t.discard}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
