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

type Props = {
  locale: "es" | "en";
  entryId?: string;
  aiConsented: boolean;
  disabled?: boolean;
  onFields: (fields: EntryDictationOutput) => void;
  onPendingVoiceNote?: (note: PendingVoiceNote) => void;
  onVoiceSaved?: () => void;
  onError?: (message: string) => void;
};

export function ExperienceDictationCard({
  locale,
  entryId,
  aiConsented,
  disabled,
  onFields,
  onPendingVoiceNote,
  onVoiceSaved,
  onError,
}: Props) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const t = locale === "es"
    ? {
        title: "Dictar la experiencia completa",
        body: "Habla con naturalidad: qué pasó, qué fue difícil y qué aprendiste. Transcribimos el audio y rellenamos los campos por ti. Se guardan el audio y el texto.",
        record: "Empezar a hablar",
        stop: "Terminar",
        processing: "Organizando tu historia…",
        consent: "Activa el consentimiento de IA para dictar.",
        micError: "No se pudo acceder al micrófono.",
        transcribeError: "No se pudo procesar el audio.",
      }
    : {
        title: "Dictate the full experience",
        body: "Speak naturally: what happened, what was hard, and what you learned. We transcribe the audio and fill in the fields for you. Both audio and text are saved.",
        record: "Start speaking",
        stop: "Finish",
        processing: "Organizing your story…",
        consent: "Enable AI consent to dictate.",
        micError: "Could not access the microphone.",
        transcribeError: "Could not process the audio.",
      };

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function handleRecordingStop(blob: Blob, mimeType: string) {
    setProcessing(true);
    try {
      const fileBase64 = await blobToBase64(blob);
      const contentType = normalizeAudioContentType(mimeType);
      const fileName = `full-${Date.now()}.${mimeTypeToExtension(contentType)}`;

      const transcribeResponse = await fetch("/api/ai/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64: fileBase64, fileName, mimeType: contentType, locale }),
      });
      const transcribeData = await transcribeResponse.json().catch(() => ({})) as { transcript?: string; error?: string };
      if (!transcribeResponse.ok) {
        onError?.(transcribeData.error ?? t.transcribeError);
        return;
      }

      const transcript = transcribeData.transcript?.trim() ?? "";
      if (!transcript) {
        onError?.(t.transcribeError);
        return;
      }

      const dictationResponse = await fetch("/api/ai/entry-dictation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, locale }),
      });
      const dictationData = await dictationResponse.json().catch(() => ({})) as EntryDictationOutput & { error?: string };
      if (!dictationResponse.ok) {
        onError?.(dictationData.error ?? t.transcribeError);
        return;
      }

      onFields(dictationData);

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
    } catch {
      onError?.(t.transcribeError);
    } finally {
      setProcessing(false);
      setSeconds(0);
    }
  }

  async function startRecording() {
    if (!aiConsented) {
      onError?.(t.consent);
      return;
    }
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

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }

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
            onClick={() => (recording ? stopRecording() : void startRecording())}
          >
            {processing ? <LoaderCircle className="animate-spin" size={16} /> : recording ? <Square size={16} /> : <Mic size={16} />}
            {processing ? t.processing : recording ? `${t.stop} (${seconds}s)` : t.record}
          </button>
        </div>
      </div>
    </div>
  );
}
