import { describe, expect, it } from "vitest";
import { inspectDictationAudioFile, resolveAttachmentContentType } from "./attachment-content-type";
import { MAX_DICTATION_AUDIO_BYTES } from "./voice-note";

describe("resolveAttachmentContentType", () => {
  it("detects pdf by extension when mime type is empty", () => {
    expect(resolveAttachmentContentType("documento.pdf", "")).toBe("application/pdf");
  });

  it("accepts application/x-pdf", () => {
    expect(resolveAttachmentContentType("file.pdf", "application/x-pdf")).toBe("application/pdf");
  });

  it("maps common audio aliases", () => {
    expect(resolveAttachmentContentType("voice.mp3", "audio/mp3")).toBe("audio/mpeg");
    expect(resolveAttachmentContentType("voice.wav", "audio/x-wav")).toBe("audio/wav");
    expect(resolveAttachmentContentType("voice.m4a", "")).toBe("audio/mp4");
    expect(resolveAttachmentContentType("voice.ogg", "audio/ogg")).toBe("audio/ogg");
  });
});

describe("inspectDictationAudioFile", () => {
  it("accepts mp3, m4a, wav, webm and ogg", () => {
    expect(inspectDictationAudioFile({ name: "memo.mp3", type: "", size: 1200 })).toEqual({
      ok: true,
      contentType: "audio/mpeg",
      fileName: "memo.mp3",
    });
    expect(inspectDictationAudioFile({ name: "Voice Note.m4a", type: "audio/x-m4a", size: 1200 }).ok).toBe(true);
    expect(inspectDictationAudioFile({ name: "clip.wav", type: "audio/wave", size: 1200 }).ok).toBe(true);
    expect(inspectDictationAudioFile({ name: "clip.webm", type: "audio/webm", size: 1200 }).ok).toBe(true);
    expect(inspectDictationAudioFile({ name: "clip.ogg", type: "audio/ogg", size: 1200 }).ok).toBe(true);
  });

  it("rejects empty files, unsupported types and files over 15 MB", () => {
    expect(inspectDictationAudioFile({ name: "empty.mp3", type: "audio/mpeg", size: 0 })).toEqual({ ok: false, reason: "empty" });
    expect(inspectDictationAudioFile({ name: "notes.pdf", type: "application/pdf", size: 1200 })).toEqual({ ok: false, reason: "type" });
    expect(inspectDictationAudioFile({ name: "song.flac", type: "audio/flac", size: 1200 })).toEqual({ ok: false, reason: "type" });
    expect(inspectDictationAudioFile({ name: "long.mp3", type: "audio/mpeg", size: MAX_DICTATION_AUDIO_BYTES + 1 })).toEqual({
      ok: false,
      reason: "size",
    });
  });
});
