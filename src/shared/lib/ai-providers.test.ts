import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { listAiProviderSlots } from "./ai-providers";

describe("listAiProviderSlots", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("GROQ_") || key.startsWith("GEMINI_") || key.startsWith("MISTRAL_") || key.startsWith("CEREBRAS_") || key.startsWith("COHERE_")) {
        delete process.env[key];
      }
    }
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns providers in fallback order when keys exist", () => {
    process.env.GROQ_API_KEY_1 = "groq-1";
    process.env.GEMINI_API_KEY_2 = "gemini-2";
    process.env.COHERE_API_KEY_3 = "cohere-3";

    expect(listAiProviderSlots().map((slot) => slot.id)).toEqual([
      "GROQ_API_KEY_1",
      "GEMINI_API_KEY_2",
      "COHERE_API_KEY_3",
    ]);
  });

  it("strips quotes from env values", () => {
    process.env.GROQ_API_KEY_1 = "'quoted-key'";
    expect(listAiProviderSlots()[0]?.apiKey).toBe("quoted-key");
  });
});
