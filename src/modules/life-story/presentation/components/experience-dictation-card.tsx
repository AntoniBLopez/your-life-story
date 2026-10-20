"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Mic, Sparkles, Square, Upload } from "lucide-react";
import { inspectDictationAudioFile } from "@/modules/life-story/domain/attachment-content-type";
import type { EntryDictationOutput } from "@/modules/life-story/domain/entry-dictation-prompt";
import {
  audioContentTypeForTranscription,
  blobToBase64,
  DICTATION_AUDIO_ACCEPT,
  mimeTypeToExtension,
  normalizeAudioContentType,
  pickRecordingMimeType,
  type PendingVoiceNote,
} from "@/modules/life-story/domain/voice-note";

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
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingSource, setProcessingSource] = useState<"record" | "upload" | null>(null);
  const [awaitingChoice, setAwaitingChoice] = useState(false);
  const [notice, setNotice] = useState<{ tone: "error" | "warning"; message: string }>();
  const [activeMode, setActiveMode] = useState<FullDictationMode>("replace");
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
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
        savedWithoutTranscript: "Audio guardado. No se pudo transcribir, pero tu voz quedó en la experiencia.",
        fileTooLarge: "El audio es demasiado largo (máx. 15 MB).",
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
        savedWithoutTranscript: "Audio saved. Transcription failed, but your voice was kept in the experience.",
        fileTooLarge: "Audio is too large (max 15 MB).",
        fileType: "Unsupported format. Use mp3, m4a, wav, webm or ogg.",
        fileEmpty: "The audio file is empty.",
        fileReadError: "Could not read the audio file.",
      };

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function saveVoiceNote(blob: Blob, mimeType: string, fileBase64: string, transcript: string, fileName: string) {
    const contentType = normalizeAudioContentType(mimeType);

    if (entryId) {
      const { uploadAttachmentAction } = await import("@/modules/life-story/application/life-entry-actions");
      const result = await uploadAttachmentAction({
        entryId,
        fileName,
        contentType,
        size: blob.size,
        fileBase64,
        fieldKey: "full",
        transcript,
      });
      if (!result.ok) reportError(result.error);
      else onVoiceSaved?.();
    } else {
      onPendingVoiceNote?.({
        fieldKey: "full",
        fileName,
        contentType,
        size: blob.size,
        fileBase64,
        transcript,
      });
    }
  }

  function transcriptionFailureMessage() {
    return saveVoiceRecordings ? t.savedWithoutTranscript : t.transcribeError;
  }

  async function processCapturedAudio(
    blob: Blob,
    mimeType: string,
    mode: FullDictationMode,
    source: "record" | "upload",
    originalName?: string,
  ) {
    setProcessing(true);
    setProcessingSource(source);
    setActiveMode(mode);
    try {
      const fileBase64 = await blobToBase64(blob);
      const contentType = normalizeAudioContentType(mimeType);
      const fileName = originalName?.trim() || `full-${Date.now()}.${mimeTypeToExtension(contentType)}`;

      let transcript = "";
      let keepAudio = true;
      try {
        const transcribeResponse = await fetch("/api/ai/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: fileBase64,
            fileName,
            mimeType: audioContentTypeForTranscription(contentType),
            locale,
          }),
        });
        const transcribeData = await transcribeResponse.json().catch(() => ({})) as { transcript?: string; error?: string };
        if (transcribeResponse.status === 413) {
          keepAudio = false;
          reportError(t.fileTooLarge);
        } else if (transcribeResponse.ok) {
          transcript = transcribeData.transcript?.trim() ?? "";
          if (!transcript) reportWarning(transcriptionFailureMessage());
        } else {
          const message = transcribeData.error ?? transcriptionFailureMessage();
          const tooLarge = /15 MB|demasiado/i.test(message);
          if (tooLarge) {
            keepAudio = false;
            reportError(t.fileTooLarge);
          } else {
            reportWarning(message);
          }
        }
      } catch {
        reportWarning(transcriptionFailureMessage());
      }

      if (!keepAudio) return;

      if (mode === "append") {
        if (transcript) onAppendTranscript?.(transcript);
        if (saveVoiceRecordings) await saveVoiceNote(blob, contentType, fileBase64, transcript, fileName);
        return;
      }

      if (transcript) {
        const dictationResponse = await fetch("/api/ai/entry-dictation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript, locale }),
        });
        const dictationData = await dictationResponse.json().catch(() => ({})) as EntryDictationOutput & { error?: string };
        if (dictationResponse.ok) {
          onFields(dictationData);
        } else {
          reportWarning(dictationData.error ?? t.transcribeError);
        }
      }

      if (saveVoiceRecordings) {
        await saveVoiceNote(blob, contentType, fileBase64, transcript, fileName);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      reportError(message.toLowerCase().includes("read") ? t.fileReadError : t.transcribeError);
    } finally {
      setProcessing(false);
      setProcessingSource(null);
      setSeconds(0);
      busyRef.current = false;
    }
  }

  async function handleRecordingStop(blob: Blob, mimeType: string) {
    const mode = dictationModeRef.current;
    await processCapturedAudio(blob, mimeType, mode, "record");
  }

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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickRecordingMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        void handleRecordingStop(blob, mimeType);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((value) => value + 1), 1000);
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
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }

  const processingLabel = activeMode === "append" ? t.processingAppend : t.processing;

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-gradient-to-br from-[#f8faf5] to-[#fcfdf9] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-[var(--moss-pale)] p-2 text-[var(--moss-deep)]">
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
              {processing && processingSource !== "upload" ? processingLabel : recording ? `${t.stop} (${seconds}s)` : t.record}
            </button>
            <label className={`btn btn-secondary cursor-pointer ${disabled || processing || recording || awaitingChoice ? "pointer-events-none opacity-60" : ""}`}>
              {processing && processingSource === "upload" ? <LoaderCircle className="animate-spin" size={16} /> : <Upload size={16} />}
              {processing && processingSource === "upload" ? processingLabel : t.upload}
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
