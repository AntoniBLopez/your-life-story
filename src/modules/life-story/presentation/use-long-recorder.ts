"use client";

import { useEffect, useRef, useState } from "react";
import {
  pickRecordingMimeType,
  RECORDING_AUDIO_BITS_PER_SECOND,
  RECORDING_TIMESLICE_MS,
} from "@/modules/life-story/domain/voice-note";
import { appendRecordingChunk, startRecordingBackup } from "@/modules/life-story/presentation/recording-backup";

export type FinishedRecording = { blob: Blob; mimeType: string; backupId: string | null };

type WakeLockSentinelLike = { release: () => Promise<void> };

/**
 * MediaRecorder wrapper for recordings of any length: speech-friendly bitrate, data
 * flushed every few seconds and mirrored to IndexedDB, and a screen wake lock so phones
 * don't stop recording when the screen turns off.
 */
export function useLongRecorder(options: { scope: string; fieldKey: string; onFinished: (recording: FinishedRecording) => void }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const onFinishedRef = useRef(options.onFinished);

  useEffect(() => {
    onFinishedRef.current = options.onFinished;
  });

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    void wakeLockRef.current?.release().catch(() => undefined);
  }, []);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const mimeType = pickRecordingMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: RECORDING_AUDIO_BITS_PER_SECOND });
    } catch {
      recorder = new MediaRecorder(stream, { mimeType });
    }
    const chunks: Blob[] = [];
    const backupId = await startRecordingBackup({ scope: options.scope, fieldKey: options.fieldKey, mimeType });
    let seq = 0;
    let backupWrites = Promise.resolve();

    recorder.ondataavailable = (event) => {
      if (event.data.size === 0) return;
      chunks.push(event.data);
      if (backupId) {
        const index = seq++;
        backupWrites = backupWrites.then(() => appendRecordingChunk(backupId, index, event.data).then(() => undefined));
      }
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      void wakeLockRef.current?.release().catch(() => undefined);
      wakeLockRef.current = null;
      const blob = new Blob(chunks, { type: mimeType });
      void backupWrites.finally(() => onFinishedRef.current({ blob, mimeType, backupId }));
    };

    recorder.start(RECORDING_TIMESLICE_MS);
    recorderRef.current = recorder;
    setRecording(true);
    setSeconds(0);
    const startedAt = Date.now();
    timerRef.current = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    try {
      const wakeLock = (navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> } }).wakeLock;
      wakeLockRef.current = wakeLock ? await wakeLock.request("screen") : null;
    } catch {
      wakeLockRef.current = null;
    }
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  return { recording, seconds, start, stop };
}

/** 75 → "1:15", 3725 → "1:02:05". */
export function formatRecordingTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
