"use client";

import { useRef, useState } from "react";
import { LoaderCircle, Mic, Sparkles, Square, Upload } from "lucide-react";
import { inspectDictationAudioFile } from "@/modules/life-story/domain/attachment-content-type";
import type { EntryDictationOutput } from "@/modules/life-story/domain/entry-dictation-prompt";
import {
  DICTATION_AUDIO_ACCEPT,
  normalizeAudioContentType,
  type PendingVoiceNote,
  voiceNoteFileName,
} from "@/modules/life-story/domain/voice-note";
import { formatRecordingTime, useLongRecorder } from "@/modules/life-story/presentation/use-long-recorder";
import { processVoiceCapture, voiceStageLabel, type VoiceStage } from "@/modules/life-story/presentation/voice-pipeline";

/** `/api/ai/entry-dictation` accepts transcripts up to this length. */
const ENTRY_DICTATION_MAX_CHARS = 8000;

export type FullDictationMode = "append" | "replace";

type Props = {
  locale: "es" | "en";
  entryId?: string;
  aiConsented: boolean;
  disabled?: boolean;
  onRequestStart?: () => Promise<FullDictationMode | null>;
  onFields: (fields: EntryDictationOutput) => void;
  onAppendTranscript?: (transcript: string) => void;
  onPendingVoiceNote?: (note: PendingVoiceNote) => void;
  onVoiceSaved?: () => void;
  saveVoiceRecordings?: boolean;
};

export function ExperienceDictationCard({
  locale,
  entryId,
  aiConsented,
  disabled,
  onRequestStart,
  onFields,
  onAppendTranscript,
  onPendingVoiceNote,
  onVoiceSaved,
  saveVoiceRecordings = true,
}: Props) {
  const [processing, setProcessing] = useState(false);
  const [organizing, setOrganizing] = useState(false);
  const [stage, setStage] = useState<VoiceStage | null>(null);
  const [processingSource, setProcessingSource] = useState<"record" | "upload" | null>(null);
  const [awaitingChoice, setAwaitingChoice] = useState(false);
  const [notice, setNotice] = useState<{ tone: "error" | "warning"; message: string }>();
  const [activeMode, setActiveMode] = useState<FullDictationMode>("replace");
  const dictationModeRef = useRef<FullDictationMode>("replace");
  const busyRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const t = locale === "es"
    ? {
        title: "Dictar la experiencia completa",
        body: saveVoiceRecordings
          ? "Habla con naturalidad o sube un audio ya grabado (mp3, m4a, wav, webm u ogg). Transcribimos el audio y rellenamos el formulario. Se guarda el audio."
          : "Habla con naturalidad o sube un audio ya grabado (mp3, m4a, wav, webm u ogg). Rellenamos el formulario a partir del audio. Solo lo usaremos para transcribir; no guardaremos ningún archivo de voz (puedes cambiarlo en Ajustes).",
        record: "Empezar a hablar",
        upload: "Subir audio",
        stop: "Terminar",
        processing: "Organizando tu historia…",
        processingAppend: "Transcribiendo…",
        consent: "Activa el consentimiento de IA para dictar.",
        micError: "No se pudo acceder al micrófono.",
        transcribeError: "No se pudo transcribir el audio.",
        fileTooLarge: "El audio pesa demasiado (máx. 150 MB). Expórtalo a menor calidad (p. ej. MP3 o M4A a 64 kbps mono) y vuelve a subirlo.",
        saving: "Guardando tu voz…",
        tooLongToOrganize: "La transcripción es muy larga para reorganizarla con IA: la hemos añadido entera a «Qué ocurrió».",
        fileType: "Formato no compatible. Usa mp3, m4a, wav, webm u ogg.",
        fileEmpty: "El archivo de audio está vacío.",
        fileReadError: "No se pudo leer el archivo de audio.",
      }
    : {
        title: "Dictate the full experience",
        body: saveVoiceRecordings
          ? "Speak naturally, or upload an existing recording (mp3, m4a, wav, webm or ogg). We transcribe the audio and fill in the form. Both audio and text are saved."
          : "Speak naturally, or upload an existing recording (mp3, m4a, wav, webm or ogg). We fill in the form from the audio. We will only use the audio to transcribe; no voice files will be stored (you can change this in Settings).",
        record: "Start speaking",
        upload: "Upload audio",
        stop: "Finish",
        processing: "Organizing your story…",
        processingAppend: "Transcribing…",
        consent: "Enable AI consent to dictate.",
        micError: "Could not access the microphone.",
        transcribeError: "Could not transcribe the audio.",
        fileTooLarge: "The audio is too large (max 150 MB). Export it at lower quality (e.g. 64 kbps mono MP3 or M4A) and upload it again.",
        saving: "Saving your voice…",
        tooLongToOrganize: "The transcript is too long to reorganize with AI, so we added all of it to “What happened”.",
        fileType: "Unsupported format. Use mp3, m4a, wav, webm or ogg.",
        fileEmpty: "The audio file is empty.",
        fileReadError: "Could not read the audio file.",
      };

  async function processCapturedAudio(
    blob: Blob,
    mimeType: string,
    mode: FullDictationMode,
    source: "record" | "upload",
    originalName?: string,
    backupId: string | null = null,
  ) {
    setProcessing(true);
    setProcessingSource(source);
    setActiveMode(mode);
    setStage(null);
    try {
      const contentType = normalizeAudioContentType(mimeType);
      const fileName = originalName?.trim() || voiceNoteFileName("full", contentType);
      const result = await processVoiceCapture({
        entryId,
        blob,
        fileName,
        contentType,
        fieldKey: "full",
        locale,
        saveVoiceRecordings,
        backupId,
        onStage: setStage,
        onPendingVoiceNote,
      });
      if (result.error) reportError(result.error);
      else if (result.warning) reportWarning(result.warning);
      if (result.saved === "uploaded") onVoiceSaved?.();

      const transcript = result.transcript.trim();
      if (!transcript) return;
      if (mode === "append") {
        onAppendTranscript?.(transcript);
        return;
      }
      if (transcript.length > ENTRY_DICTATION_MAX_CHARS) {
        // Too long to reorganize with AI in one go: keep every word in «Qué ocurrió».
        onAppendTranscript?.(transcript);
        reportWarning(t.tooLongToOrganize);
        return;
      }
      setStage(null);
      setOrganizing(true);
      const dictationResponse = await fetch("/api/ai/entry-dictation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, locale }),
      });
      const dictationData = await dictationResponse.json().catch(() => ({})) as EntryDictationOutput & { error?: string };
      if (dictationResponse.ok) {
        onFields(dictationData);
      } else {
        onAppendTranscript?.(transcript);
        reportWarning(dictationData.error ?? t.transcribeError);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      reportError(message.toLowerCase().includes("read") ? t.fileReadError : t.transcribeError);
    } finally {
      setProcessing(false);
      setProcessingSource(null);
      setOrganizing(false);
      setStage(null);
      busyRef.current = false;
    }
  }

  const recorder = useLongRecorder({
    scope: entryId ?? "new",
    fieldKey: "full",
    onFinished: ({ blob, mimeType, backupId }) => void processCapturedAudio(blob, mimeType, dictationModeRef.current, "record", undefined, backupId),
  });
  const recording = recorder.recording;

  function reportError(message: string) {
    setNotice({ tone: "error", message });
  }

  function reportWarning(message: string) {
    setNotice({ tone: "warning", message });
  }

  async function chooseMode() {
    setAwaitingChoice(true);
    try {
      return onRequestStart ? await onRequestStart() : "replace" as const;
    } finally {
      setAwaitingChoice(false);
    }
  }

  async function startRecording(mode: FullDictationMode) {
    if (!aiConsented) {
      busyRef.current = false;
      reportError(t.consent);
      return;
    }
    dictationModeRef.current = mode;
    setActiveMode(mode);
    try {
      await recorder.start();
    } catch {
      busyRef.current = false;
      reportError(t.micError);
    }
  }

  async function handleRecordClick() {
    if (recording) {
      stopRecording();
      return;
    }
    if (busyRef.current || processing || awaitingChoice) return;
    if (!aiConsented) {
      reportError(t.consent);
      return;
    }
    setNotice(undefined);
    busyRef.current = true;
    const mode = await chooseMode();
    if (!mode) {
      busyRef.current = false;
      return;
    }
    await startRecording(mode);
  }

  async function handleAudioFile(file: File | undefined) {
    if (!file || busyRef.current || recording || processing || awaitingChoice) return;
    if (!aiConsented) {
      reportError(t.consent);
      return;
    }
    const inspected = inspectDictationAudioFile(file);
    if (!inspected.ok) {
      reportError(inspected.reason === "size" ? t.fileTooLarge : inspected.reason === "empty" ? t.fileEmpty : t.fileType);
      return;
    }
    setNotice(undefined);
    busyRef.current = true;
    const mode = await chooseMode();
    if (!mode) {
      busyRef.current = false;
      return;
    }
    await processCapturedAudio(file, inspected.contentType, mode, "upload", inspected.fileName);
  }

  function stopRecording() {
    recorder.stop();
  }

  const processingLabel = organizing
    ? t.processing
    : voiceStageLabel(stage, locale) ?? (activeMode === "append" ? t.processingAppend : t.processing);
  const buttonProcessingLabel = organizing ? t.processing : stage?.kind === "saving" ? t.saving : t.processingAppend;

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-gradient-to-br from-[var(--surface-wash)] to-[var(--surface-inset)] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-[var(--moss-pale)] p-2 text-[var(--accent)]">
          <Sparkles size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-[var(--ink)]">{t.title}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{t.body}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={disabled || processing || awaitingChoice}
              onClick={() => void handleRecordClick()}
            >
              {processing && processingSource !== "upload" ? <LoaderCircle className="animate-spin" size={16} /> : recording ? <Square size={16} /> : <Mic size={16} />}
              {processing && processingSource !== "upload" ? buttonProcessingLabel : recording ? `${t.stop} (${formatRecordingTime(recorder.seconds)})` : t.record}
            </button>
            <label className={`btn btn-secondary cursor-pointer ${disabled || processing || recording || awaitingChoice ? "pointer-events-none opacity-60" : ""}`}>
              {processing && processingSource === "upload" ? <LoaderCircle className="animate-spin" size={16} /> : <Upload size={16} />}
              {processing && processingSource === "upload" ? buttonProcessingLabel : t.upload}
              <input
                ref={fileInputRef}
                className="sr-only"
                type="file"
                accept={DICTATION_AUDIO_ACCEPT}
                disabled={disabled || processing || recording || awaitingChoice}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  void handleAudioFile(file);
                }}
              />
            </label>
          </div>
          {processing && (
            <p role="status" className="mt-3 flex items-center gap-2 text-sm text-[var(--muted)]">
              <LoaderCircle className="animate-spin" size={14} />
              {processingLabel}
            </p>
          )}
          {notice && !processing && (
            <p role={notice.tone === "error" ? "alert" : "status"} className={`mt-3 text-sm ${notice.tone === "error" ? "text-[var(--danger)]" : "text-[var(--ink)]"}`}>
              {notice.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
