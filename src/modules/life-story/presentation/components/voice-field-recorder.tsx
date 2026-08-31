"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Mic, Square } from "lucide-react";
import {
  appendTranscript,
  blobToBase64,
  mimeTypeToExtension,
  normalizeAudioContentType,
  pickRecordingMimeType,
  type PendingVoiceNote,
  type VoiceFieldKey,
} from "@/modules/life-story/domain/voice-note";
import { uploadAttachmentAction } from "@/modules/life-story/application/life-entry-actions";

type Props = {
  locale: "es" | "en";
  fieldKey: VoiceFieldKey;
  entryId?: string;
  aiConsented: boolean;
  disabled?: boolean;
  onTranscript: (text: string) => void;
  onPendingVoiceNote?: (note: PendingVoiceNote) => void;
  onVoiceSaved?: () => void;
  onError?: (message: string) => void;
  compact?: boolean;
};

export function VoiceFieldRecorder({
  locale,
  fieldKey,
  entryId,
  aiConsented,
  disabled,
  onTranscript,
  onPendingVoiceNote,
  onVoiceSaved,
  onError,
  compact,
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
        record: compact ? "Dictar" : "Hablar",
        stop: "Parar",
        processing: "Transcribiendo…",
        consent: "Activa el consentimiento de IA para dictar.",
        micError: "No se pudo acceder al micrófono.",
        transcribeError: "No se pudo transcribir el audio.",
      }
    : {
        record: compact ? "Dictate" : "Speak",
        stop: "Stop",
        processing: "Transcribing…",
        consent: "Enable AI consent to dictate.",
        micError: "Could not access the microphone.",
        transcribeError: "Could not transcribe the audio.",
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
      const fileName = `${fieldKey}-${Date.now()}.${mimeTypeToExtension(contentType)}`;

      const response = await fetch("/api/ai/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64: fileBase64, fileName, mimeType: contentType, locale }),
      });
      const data = await response.json().catch(() => ({})) as { transcript?: string; error?: string };
      if (!response.ok) {
        onError?.(data.error ?? t.transcribeError);
        return;
      }

      const transcript = data.transcript?.trim() ?? "";
      if (transcript) onTranscript(transcript);

      if (entryId) {
        const result = await uploadAttachmentAction({
          entryId,
          fileName,
          contentType,
          size: blob.size,
          fileBase64,
          fieldKey,
          transcript,
        });
        if (!result.ok) onError?.(result.error);
        else onVoiceSaved?.();
      } else {
        onPendingVoiceNote?.({
          fieldKey,
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
    setProcessing(false);
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

  const label = processing ? t.processing : recording ? `${t.stop} (${seconds}s)` : t.record;

  return (
    <button
      type="button"
      className={compact ? "btn btn-quiet !px-2 !py-1 text-xs" : "btn btn-secondary !px-3 !py-2 text-xs"}
      disabled={disabled || processing}
      onClick={() => (recording ? stopRecording() : void startRecording())}
      aria-pressed={recording}
    >
      {processing ? <LoaderCircle className="animate-spin" size={14} /> : recording ? <Square size={14} /> : <Mic size={14} />}
      {label}
    </button>
  );
}

export function appendFieldTranscript(current: string, transcript: string) {
  return appendTranscript(current, transcript);
}
