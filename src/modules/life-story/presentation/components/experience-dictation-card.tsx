"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Mic, Sparkles, Square } from "lucide-react";
import type { EntryDictationOutput } from "@/modules/life-story/domain/entry-dictation-prompt";
import {
  blobToBase64,
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
  onError?: (message: string) => void;
  onWarning?: (message: string) => void;
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
  onError,
  onWarning,
  saveVoiceRecordings = true,
}: Props) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [activeMode, setActiveMode] = useState<FullDictationMode>("replace");
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const dictationModeRef = useRef<FullDictationMode>("replace");

  const t = locale === "es"
    ? {
        title: "Dictar la experiencia completa",
        body: saveVoiceRecordings
          ? "Habla con naturalidad: qué pasó, qué fue difícil y qué aprendiste. Transcribimos el audio y rellenamos los campos por ti. Se guardan el audio y el texto."
          : "Habla con naturalidad. Solo usaremos el audio para transcribir; no guardaremos ningún archivo de voz (puedes cambiarlo en Ajustes).",
        record: "Empezar a hablar",
        stop: "Terminar",
        processing: "Organizando tu historia…",
        processingAppend: "Transcribiendo…",
        consent: "Activa el consentimiento de IA para dictar.",
        micError: "No se pudo acceder al micrófono.",
        transcribeError: "No se pudo transcribir el audio.",
        savedWithoutTranscript: "Audio guardado. No se pudo transcribir, pero tu voz quedó en la experiencia.",
      }
    : {
        title: "Dictate the full experience",
        body: saveVoiceRecordings
          ? "Speak naturally: what happened, what was hard, and what you learned. We transcribe the audio and fill in the fields for you. Both audio and text are saved."
          : "Speak naturally. We will only use the audio to transcribe; no voice files will be stored (you can change this in Settings).",
        record: "Start speaking",
        stop: "Finish",
        processing: "Organizing your story…",
        processingAppend: "Transcribing…",
        consent: "Enable AI consent to dictate.",
        micError: "Could not access the microphone.",
        transcribeError: "Could not transcribe the audio.",
        savedWithoutTranscript: "Audio saved. Transcription failed, but your voice was kept in the experience.",
      };

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function saveVoiceNote(blob: Blob, mimeType: string, fileBase64: string, transcript: string) {
    const contentType = normalizeAudioContentType(mimeType);
    const fileName = `full-${Date.now()}.${mimeTypeToExtension(contentType)}`;

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
      if (!result.ok) onError?.(result.error);
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

  async function handleRecordingStop(blob: Blob, mimeType: string) {
    setProcessing(true);
    const mode = dictationModeRef.current;
    try {
      const fileBase64 = await blobToBase64(blob);
      const contentType = normalizeAudioContentType(mimeType);
      const fileName = `full-${Date.now()}.${mimeTypeToExtension(contentType)}`;

      let transcript = "";
      try {
        const transcribeResponse = await fetch("/api/ai/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audioBase64: fileBase64, fileName, mimeType: contentType, locale }),
        });
        const transcribeData = await transcribeResponse.json().catch(() => ({})) as { transcript?: string; error?: string };
        if (transcribeResponse.ok) {
          transcript = transcribeData.transcript?.trim() ?? "";
        } else {
          onWarning?.(transcribeData.error ?? t.savedWithoutTranscript);
        }
      } catch {
        onWarning?.(t.savedWithoutTranscript);
      }

      if (mode === "append") {
        if (transcript) onAppendTranscript?.(transcript);
        if (saveVoiceRecordings) await saveVoiceNote(blob, mimeType, fileBase64, transcript);
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
          onWarning?.(dictationData.error ?? t.transcribeError);
        }
      }

      if (saveVoiceRecordings) {
        await saveVoiceNote(blob, mimeType, fileBase64, transcript);
      }
    } catch {
      onError?.(t.transcribeError);
    } finally {
      setProcessing(false);
      setSeconds(0);
    }
  }

  async function startRecording(mode: FullDictationMode) {
    if (!aiConsented) {
      onError?.(t.consent);
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
      onError?.(t.micError);
    }
  }

  async function handleRecordClick() {
    if (recording) {
      stopRecording();
      return;
    }
    const mode = onRequestStart ? await onRequestStart() : "replace";
    if (!mode) return;
    await startRecording(mode);
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
          <button
            type="button"
            className="btn btn-primary mt-4"
            disabled={disabled || processing}
            onClick={() => void handleRecordClick()}
          >
            {processing ? <LoaderCircle className="animate-spin" size={16} /> : recording ? <Square size={16} /> : <Mic size={16} />}
            {processing ? processingLabel : recording ? `${t.stop} (${seconds}s)` : t.record}
          </button>
        </div>
      </div>
    </div>
  );
}
