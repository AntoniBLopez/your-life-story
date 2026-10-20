import { describe, expect, it } from "vitest";
import { appendTranscript, audioContentTypeForTranscription, mimeTypeToExtension, normalizeAudioContentType } from "./voice-note";

describe("appendTranscript", () => {
  it("appends with paragraph break when text already exists", () => {
    expect(appendTranscript("Primera parte.", "Segunda parte.")).toBe("Primera parte.\n\nSegunda parte.");
  });

  it("returns transcript when current text is empty", () => {
    expect(appendTranscript("", "Solo esto.")).toBe("Solo esto.");
  });

  it("ignores empty transcript", () => {
    expect(appendTranscript("Algo", "   ")).toBe("Algo");
  });
});

describe("normalizeAudioContentType", () => {
  it("strips codec suffix from webm", () => {
    expect(normalizeAudioContentType("audio/webm;codecs=opus")).toBe("audio/webm");
  });
});

describe("audioContentTypeForTranscription", () => {
  it("sends m4a to the transcription provider as mp4", () => {
    expect(audioContentTypeForTranscription("audio/x-m4a")).toBe("audio/mp4");
    expect(audioContentTypeForTranscription("audio/mpeg")).toBe("audio/mpeg");
  });
});

describe("mimeTypeToExtension", () => {
  it("maps common mime types", () => {
    expect(mimeTypeToExtension("audio/webm")).toBe("webm");
    expect(mimeTypeToExtension("audio/mp4")).toBe("m4a");
  });
});
