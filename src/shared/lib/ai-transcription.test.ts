import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
vi.mock("openai", () => ({
  default: class {
    audio = { transcriptions: { create } };
  },
}));

import { retryAfterSecondsFromError, transcribeAudio, transcriptionModel, TranscriptionRateLimitError } from "./ai-providers";

function rateLimited(retryAfter?: string) {
  return Object.assign(new Error("429 Rate limit"), { status: 429, headers: retryAfter ? { "retry-after": retryAfter } : {} });
}

describe("transcribeAudio (OpenAI SDK mocked, no network)", () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    create.mockReset();
    for (const key of Object.keys(process.env)) if (key.startsWith("GROQ_")) delete process.env[key];
    process.env.GROQ_API_KEY_1 = "k1";
    process.env.GROQ_API_KEY_2 = "k2";
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("uses whisper-large-v3 by default and allows overriding the model", async () => {
    create.mockResolvedValue(" hola ");
    expect(await transcribeAudio(new Uint8Array(10), "a.webm", "audio/webm")).toBe("hola");
    expect(create.mock.calls[0]![0]).toMatchObject({ model: "whisper-large-v3", response_format: "text", temperature: 0 });
    process.env.GROQ_TRANSCRIPTION_MODEL = "whisper-large-v3-turbo";
    expect(transcriptionModel()).toBe("whisper-large-v3-turbo");
  });

  it("falls back to the second key when the first is rate limited", async () => {
    create.mockRejectedValueOnce(rateLimited("30")).mockResolvedValueOnce("texto");
    expect(await transcribeAudio(new Uint8Array(10), "a.webm", "audio/webm")).toBe("texto");
  });

  it("throws TranscriptionRateLimitError with the shortest wait when every key is rate limited", async () => {
    create.mockRejectedValueOnce(rateLimited("600")).mockRejectedValueOnce(rateLimited("45"));
    const error = await transcribeAudio(new Uint8Array(10), "a.webm", "audio/webm").catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(TranscriptionRateLimitError);
    expect((error as TranscriptionRateLimitError).retryAfterSeconds).toBe(45);
  });

  it("rejects empty text unless allowEmpty (silent segments)", async () => {
    create.mockResolvedValue("  ");
    await expect(transcribeAudio(new Uint8Array(10), "a.webm", "audio/webm")).rejects.toThrow();
    create.mockResolvedValue("  ");
    expect(await transcribeAudio(new Uint8Array(10), "a.webm", "audio/webm", { allowEmpty: true })).toBe("");
  });

  it("reads retry-after, defaulting to 60 seconds", () => {
    expect(retryAfterSecondsFromError(rateLimited("12.2"))).toBe(13);
    expect(retryAfterSecondsFromError({ headers: new Headers({ "retry-after": "5" }) })).toBe(5);
    expect(retryAfterSecondsFromError(new Error("x"))).toBe(60);
  });
});
