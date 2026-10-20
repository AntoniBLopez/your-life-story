import { describe, expect, it, vi } from "vitest";

// Keep the real Mongo and consent modules out of this test: every dependency is injected.
vi.mock("@/shared/lib/mongodb/client", () => ({ getDb: vi.fn(() => { throw new Error("no database in tests"); }) }));
vi.mock("@/modules/reflection/application/reflection-service", () => ({ getReflectionState: vi.fn() }));

import { TRANSCRIPTION_SEGMENT_BYTES } from "@/modules/life-story/domain/audio/audio-segments";
import { TranscriptionRateLimitError } from "@/shared/lib/ai-providers";
import type { AttachmentRecord, TranscriptionJobState } from "@/shared/lib/mongodb/attachments";
import { startAttachmentTranscription, transcribeAttachmentSegment, type TranscriptionDeps } from "./transcription-service";

const USER = "user-1";
const ID = "64b7f0c2a1b2c3d4e5f60718";

/** A mono 16-bit 8 kHz WAV of `bytes` PCM bytes (silence). */
function wav(dataBytes: number) {
  const out = new Uint8Array(44 + dataBytes);
  const view = new DataView(out.buffer);
  const ascii = (offset: number, text: string) => [...text].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  ascii(0, "RIFF"); view.setUint32(4, 36 + dataBytes, true); ascii(8, "WAVE");
  ascii(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true); view.setUint32(28, 16000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  ascii(36, "data"); view.setUint32(40, dataBytes, true);
  return out;
}

function attachment(overrides: Partial<AttachmentRecord> = {}): AttachmentRecord {
  return {
    id: ID, userId: USER, entryId: "e1", storagePath: "", gridFsId: "g1", fileName: "voz.wav", mimeType: "audio/wav",
    sizeBytes: 0, fieldKey: "narrative", transcript: null, transcriptionProgress: null, createdAt: new Date(), ...overrides,
  };
}

/** In-memory stand-in for the attachment record and its transcription job. */
function setup(file: Uint8Array, options: { record?: Partial<AttachmentRecord>; consented?: boolean; configured?: boolean; transcribe?: TranscriptionDeps["transcribe"] } = {}) {
  let job: { segments: (string | null)[] } | null = null;
  let transcript: string | null = null;
  const stateOf = (): TranscriptionJobState | null => {
    if (!job) return transcript === null ? null : { total: 0, done: 0, pendingSegments: [], transcript };
    const pendingSegments = job.segments.flatMap((text, i) => (text === null ? [i] : []));
    return { total: job.segments.length, done: job.segments.length - pendingSegments.length, pendingSegments, transcript };
  };
  const reads: Array<[number, number]> = [];
  const transcribe = vi.fn(options.transcribe ?? (async (_bytes: Buffer | Uint8Array, name: string) => `texto ${name}`));
  const deps: TranscriptionDeps = {
    getAttachment: vi.fn(async () => attachment(options.record)),
    getFileLength: vi.fn(async () => file.byteLength),
    createReader: vi.fn(() => async (start: number, end: number) => {
      reads.push([start, end]);
      return file.slice(start, Math.min(end, file.byteLength));
    }),
    begin: vi.fn(async (_u: string, _id: string, count: number, opts: { restart?: boolean } = {}) => {
      if (!job || job.segments.length !== count || opts.restart) {
        job = { segments: Array.from({ length: count }, () => null) };
        transcript = null;
      }
      return stateOf();
    }),
    getState: vi.fn(async () => stateOf()),
    saveSegment: vi.fn(async (_u: string, _id: string, index: number, text: string) => {
      if (!job) return stateOf();
      job.segments[index] = text;
      if (job.segments.every((segment) => segment !== null)) {
        transcript = job.segments.filter(Boolean).join(" ");
        job = null;
        return { total: 0, done: 0, pendingSegments: [], transcript };
      }
      return stateOf();
    }),
    isConsented: vi.fn(async () => options.consented ?? true),
    isConfigured: vi.fn(() => options.configured ?? true),
    transcribe: transcribe as unknown as TranscriptionDeps["transcribe"],
  };
  return { deps, transcribe, reads };
}

describe("segmented transcription service (provider mocked)", () => {
  it("splits a long audio into segments under the provider limit and joins the text in order", async () => {
    const file = wav(TRANSCRIPTION_SEGMENT_BYTES * 2 + 1234);
    const { deps, transcribe, reads } = setup(file);

    const started = await startAttachmentTranscription(USER, ID, {}, deps);
    expect(started).toEqual({ ok: true, data: { total: 3, done: 0, pendingSegments: [0, 1, 2], transcript: null } });

    for (const index of [0, 1, 2]) {
      const result = await transcribeAttachmentSegment(USER, ID, String(index), deps);
      expect(result.ok).toBe(true);
    }
    const last = await deps.getState(USER, ID);
    expect(last?.transcript).toBe("texto segment-1.wav texto segment-2.wav texto segment-3.wav");
    expect(transcribe).toHaveBeenCalledTimes(3);
    for (const [bytes, , mime, opts] of transcribe.mock.calls) {
      expect((bytes as Uint8Array).byteLength).toBeLessThanOrEqual(TRANSCRIPTION_SEGMENT_BYTES + 1024);
      expect(mime).toBe("audio/wav");
      expect(opts).toEqual({ allowEmpty: true, timeoutMs: 45_000 });
    }
    // Ranged reads only: never loads the whole file at once.
    expect(Math.max(...reads.map(([start, end]) => end - start))).toBeLessThan(file.byteLength);
  });

  it("is idempotent and resumable: a finished segment is not sent again", async () => {
    const { deps, transcribe } = setup(wav(TRANSCRIPTION_SEGMENT_BYTES + 10));
    await startAttachmentTranscription(USER, ID, {}, deps);
    await transcribeAttachmentSegment(USER, ID, "0", deps);
    const again = await transcribeAttachmentSegment(USER, ID, "0", deps);
    expect(again).toEqual({ ok: true, data: { total: 2, done: 1, pendingSegments: [1], transcript: null } });

    const resumed = await startAttachmentTranscription(USER, ID, {}, deps);
    expect(resumed.ok && resumed.data.pendingSegments).toEqual([1]);
    expect(transcribe).toHaveBeenCalledTimes(1);

    const restarted = await startAttachmentTranscription(USER, ID, { restart: true }, deps);
    expect(restarted.ok && restarted.data.pendingSegments).toEqual([0, 1]);
  });

  it("maps provider rate limits to 429 with the wait time and keeps progress", async () => {
    const { deps } = setup(wav(TRANSCRIPTION_SEGMENT_BYTES + 10), {
      transcribe: async () => { throw new TranscriptionRateLimitError(120); },
    });
    await startAttachmentTranscription(USER, ID, {}, deps);
    expect(await transcribeAttachmentSegment(USER, ID, "0", deps)).toEqual({ ok: false, code: "rate_limited", status: 429, retryAfterSeconds: 120 });
    expect((await deps.getState(USER, ID))?.pendingSegments).toEqual([0, 1]);
  });

  it("returns 502 for other provider errors without losing finished segments", async () => {
    let calls = 0;
    const { deps } = setup(wav(TRANSCRIPTION_SEGMENT_BYTES + 10), {
      transcribe: async () => {
        calls += 1;
        if (calls === 2) throw new Error("boom");
        return "hola";
      },
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    await startAttachmentTranscription(USER, ID, {}, deps);
    await transcribeAttachmentSegment(USER, ID, "0", deps);
    expect(await transcribeAttachmentSegment(USER, ID, "1", deps)).toMatchObject({ ok: false, code: "provider_error", status: 502 });
    expect(await deps.getState(USER, ID)).toMatchObject({ done: 1, pendingSegments: [1] });
  });

  it("accepts silent segments (empty text)", async () => {
    const { deps } = setup(wav(1000), { transcribe: async () => "" });
    await startAttachmentTranscription(USER, ID, {}, deps);
    expect(await transcribeAttachmentSegment(USER, ID, "0", deps)).toEqual({ ok: true, data: { total: 0, done: 0, pendingSegments: [], transcript: "" } });
  });

  it("validates the request before calling the provider", async () => {
    const file = wav(1000);
    expect(await startAttachmentTranscription(USER, ID, {}, setup(file, { record: { fileName: "doc.pdf", mimeType: "application/pdf" } }).deps)).toMatchObject({ code: "not_audio", status: 400 });
    expect(await startAttachmentTranscription(USER, ID, {}, setup(file, { consented: false }).deps)).toMatchObject({ code: "consent_required", status: 403 });
    expect(await startAttachmentTranscription(USER, ID, {}, setup(file, { configured: false }).deps)).toMatchObject({ code: "not_configured", status: 503 });
    expect(await startAttachmentTranscription(USER, ID, {}, setup(new Uint8Array(5000)).deps)).toMatchObject({ code: "unsupported_audio", status: 422 });

    const { deps, transcribe } = setup(file);
    await startAttachmentTranscription(USER, ID, {}, deps);
    expect(await transcribeAttachmentSegment(USER, ID, "abc", deps)).toMatchObject({ code: "bad_segment", status: 400 });
    expect(await transcribeAttachmentSegment(USER, ID, "7", deps)).toMatchObject({ code: "bad_segment", status: 409 });
    expect(transcribe).not.toHaveBeenCalled();
  });
});
