import { describe, expect, it, vi } from "vitest";
import { DIRECT_TRANSCRIBE_MAX_BYTES, type PendingVoiceNote } from "@/modules/life-story/domain/voice-note";
import { processVoiceCapture, type VoicePipelineDeps, type VoicePipelineInput } from "./voice-pipeline";

const small = new Blob([new Uint8Array(1000)], { type: "audio/webm" });
const large = new Blob([new Uint8Array(DIRECT_TRANSCRIBE_MAX_BYTES + 1)], { type: "audio/webm" });

function deps(overrides: Partial<VoicePipelineDeps> = {}) {
  const base: VoicePipelineDeps = {
    upload: vi.fn(async () => ({ ok: true as const, data: { id: "att1" } })) as unknown as VoicePipelineDeps["upload"],
    transcribeSaved: vi.fn(async () => ({ ok: true as const, transcript: "texto largo" })),
    transcribeDirect: vi.fn(async () => ({ ok: true as const, transcript: "texto corto" })),
    deleteAttachment: vi.fn(async () => ({})),
    deleteBackup: vi.fn(async () => {}),
    toBase64: vi.fn(async () => "QUJD"),
  };
  return { ...base, ...overrides };
}

function input(blob: Blob, d: VoicePipelineDeps, extra: Partial<VoicePipelineInput> = {}): VoicePipelineInput {
  return { blob, fileName: "voz.webm", contentType: "audio/webm", fieldKey: "narrative", locale: "es", saveVoiceRecordings: true, backupId: "b1", deps: d, ...extra };
}

describe("processVoiceCapture: never lose a recording", () => {
  it("uploads before transcribing and only then deletes the browser backup", async () => {
    const order: string[] = [];
    const d = deps({
      upload: vi.fn(async () => { order.push("upload"); return { ok: true as const, data: { id: "att1" } }; }) as unknown as VoicePipelineDeps["upload"],
      deleteBackup: vi.fn(async () => { order.push("deleteBackup"); }),
      transcribeSaved: vi.fn(async () => { order.push("transcribe"); return { ok: true as const, transcript: "hola" }; }),
    });
    const result = await processVoiceCapture(input(large, d, { entryId: "e1" }));
    expect(result).toEqual({ saved: "uploaded", attachmentId: "att1", transcript: "hola" });
    expect(order).toEqual(["upload", "deleteBackup", "transcribe"]);
  });

  it("keeps the browser backup when the upload fails", async () => {
    const d = deps({ upload: vi.fn(async () => ({ ok: false as const, error: "Sin conexión." })) as unknown as VoicePipelineDeps["upload"] });
    const result = await processVoiceCapture(input(large, d, { entryId: "e1" }));
    expect(result.saved).toBe("failed");
    expect(result.error).toContain("Sigue a salvo en este navegador");
    expect(d.deleteBackup).not.toHaveBeenCalled();
    expect(d.transcribeSaved).not.toHaveBeenCalled();
  });

  it("keeps the uploaded audio when transcription fails", async () => {
    const d = deps({ transcribeSaved: vi.fn(async () => ({ ok: false as const, code: "provider_error" as const, error: "No se pudo transcribir.", done: 1, total: 3 })) });
    const result = await processVoiceCapture(input(large, d, { entryId: "e1" }));
    expect(result).toMatchObject({ saved: "uploaded", attachmentId: "att1", transcript: "" });
    expect(d.deleteAttachment).not.toHaveBeenCalled();
  });

  it("keeps the audio even with 'save my voice' off if transcription fails", async () => {
    const d = deps({
      transcribeDirect: vi.fn(async () => ({ ok: false as const })),
      transcribeSaved: vi.fn(async () => ({ ok: false as const, code: "rate_limited" as const, error: "Límite.", done: 0, total: 1 })),
    });
    const result = await processVoiceCapture(input(small, d, { entryId: "e1", saveVoiceRecordings: false }));
    expect(result.saved).toBe("uploaded");
    expect(result.warning).toContain("Guardamos el audio");
    expect(d.deleteAttachment).not.toHaveBeenCalled();
  });

  it("deletes the stored audio only after a successful transcription when 'save my voice' is off", async () => {
    const d = deps();
    const result = await processVoiceCapture(input(large, d, { entryId: "e1", saveVoiceRecordings: false }));
    expect(result).toEqual({ saved: "not_stored", transcript: "texto largo" });
    expect(d.deleteAttachment).toHaveBeenCalledWith("att1", "e1", "es");
  });

  it("transcribes short audio directly and never sends long audio inline", async () => {
    const d = deps();
    await processVoiceCapture(input(large, d, { entryId: "e1", saveVoiceRecordings: false }));
    expect(d.transcribeDirect).not.toHaveBeenCalled();

    const short = await processVoiceCapture(input(small, d, { entryId: "e1", saveVoiceRecordings: false }));
    expect(short).toEqual({ saved: "not_stored", transcript: "texto corto" });
  });

  it("queues long audio as a pending note (Blob, no base64) before the experience exists", async () => {
    const d = deps();
    const notes: PendingVoiceNote[] = [];
    const result = await processVoiceCapture(input(large, d, { onPendingVoiceNote: (note) => notes.push(note) }));
    expect(result.saved).toBe("pending");
    expect(notes[0]).toMatchObject({ blob: large, fileBase64: "", needsTranscription: true, backupId: "b1" });
    expect(d.transcribeDirect).not.toHaveBeenCalled();
    expect(d.deleteBackup).not.toHaveBeenCalled();
  });

  it("queues a short note with its transcript, or flagged for later if transcription failed", async () => {
    const notes: PendingVoiceNote[] = [];
    await processVoiceCapture(input(small, deps(), { onPendingVoiceNote: (note) => notes.push(note) }));
    expect(notes[0]).toMatchObject({ fileBase64: "QUJD", transcript: "texto corto", needsTranscription: false });

    const failing = deps({ transcribeDirect: vi.fn(async () => ({ ok: false as const })) });
    await processVoiceCapture(input(small, failing, { saveVoiceRecordings: false, onPendingVoiceNote: (note) => notes.push(note) }));
    expect(notes[1]).toMatchObject({ needsTranscription: true, deleteAfterTranscription: true });
  });
});
