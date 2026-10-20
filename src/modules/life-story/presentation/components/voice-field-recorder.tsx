"use client";

import { useState } from "react";
import { LoaderCircle, Mic, Square } from "lucide-react";
import {
  appendTranscript,
  normalizeAudioContentType,
  type PendingVoiceNote,
  type VoiceFieldKey,
  voiceNoteFileName,
} from "@/modules/life-story/domain/voice-note";
import { formatRecordingTime, useLongRecorder, type FinishedRecording } from "@/modules/life-story/presentation/use-long-recorder";
import { processVoiceCapture, voiceStageLabel, type VoiceStage } from "@/modules/life-story/presentation/voice-pipeline";

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
  onWarning?: (message: string) => void;
  saveVoiceRecordings?: boolean;
  compact?: boolean;
};

function shortStageLabel(stage: VoiceStage | null, locale: "es" | "en") {
  if (!stage) return locale === "es" ? "Guardando tu voz…" : "Saving your voice…";
  if (stage.kind === "saving") return `${locale === "es" ? "Guardando" : "Saving"} ${Math.round(stage.fraction * 100)} %`;
  if (stage.kind === "waiting") return locale === "es" ? "En pausa…" : "Paused…";
  return stage.total > 1 ? `${locale === "es" ? "Transcribiendo" : "Transcribing"} ${Math.min(stage.done + 1, stage.total)}/${stage.total}` : (locale === "es" ? "Transcribiendo…" : "Transcribing…");
}

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
  onWarning,
  saveVoiceRecordings = true,
  compact,
}: Props) {
  const [processing, setProcessing] = useState(false);
  const [stage, setStage] = useState<VoiceStage | null>(null);

  const t = locale === "es"
    ? {
        record: compact ? "Dictar" : "Hablar",
        stop: "Parar",
        consent: "Activa el consentimiento de IA para dictar.",
        micError: "No se pudo acceder al micrófono.",
        uploadError: "No se pudo guardar el audio.",
      }
    : {
        record: compact ? "Dictate" : "Speak",
        stop: "Stop",
        consent: "Enable AI consent to dictate.",
        micError: "Could not access the microphone.",
        uploadError: "Could not save the audio.",
      };

  async function handleRecordingStop({ blob, mimeType, backupId }: FinishedRecording) {
    setProcessing(true);
    setStage(null);
    try {
      const contentType = normalizeAudioContentType(mimeType);
      const result = await processVoiceCapture({
        entryId,
        blob,
        fileName: voiceNoteFileName(fieldKey, contentType),
        contentType,
        fieldKey,
        locale,
        saveVoiceRecordings,
        backupId,
        onStage: setStage,
        onPendingVoiceNote,
      });
      if (result.transcript) onTranscript(result.transcript);
      if (result.error) onError?.(result.error);
      else if (result.warning) onWarning?.(result.warning);
      if (result.saved === "uploaded") onVoiceSaved?.();
    } catch {
      onError?.(t.uploadError);
    } finally {
      setProcessing(false);
      setStage(null);
    }
  }

  const recorder = useLongRecorder({ scope: entryId ?? "new", fieldKey, onFinished: (recording) => void handleRecordingStop(recording) });

  async function startRecording() {
    if (!aiConsented) {
      onError?.(t.consent);
      return;
    }
    try {
      await recorder.start();
    } catch {
      onError?.(t.micError);
    }
  }

  const label = processing
    ? shortStageLabel(stage, locale)
    : recorder.recording ? `${t.stop} (${formatRecordingTime(recorder.seconds)})` : t.record;

  return (
    <button
      type="button"
      className={`btn btn-secondary shrink-0 text-xs ${compact ? "!px-2.5 !py-1" : "!px-3 !py-2"}`}
      disabled={disabled || processing}
      onClick={() => (recorder.recording ? recorder.stop() : void startRecording())}
      aria-pressed={recorder.recording}
      title={processing ? voiceStageLabel(stage, locale) ?? undefined : undefined}
    >
      {processing ? <LoaderCircle className="animate-spin" size={14} /> : recorder.recording ? <Square size={14} /> : <Mic size={14} />}
      {label}
    </button>
  );
}

export function appendFieldTranscript(current: string, transcript: string) {
  return appendTranscript(current, transcript);
}
