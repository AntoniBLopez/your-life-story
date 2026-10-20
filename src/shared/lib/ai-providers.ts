import OpenAI from "openai";

export type AiProviderKind = "groq" | "gemini" | "mistral" | "cerebras" | "cohere";

export type AiProviderSlot = {
  id: string;
  kind: AiProviderKind;
  apiKey: string;
  baseURL: string;
  model: string;
};

const AI_KEY_CHAIN: { envKey: string; kind: AiProviderKind; baseURL: string; model: string }[] = [
  { envKey: "GROQ_API_KEY_1", kind: "groq", baseURL: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  { envKey: "GROQ_API_KEY_2", kind: "groq", baseURL: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  { envKey: "GEMINI_API_KEY_1", kind: "gemini", baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/", model: "gemini-2.0-flash" },
  { envKey: "GEMINI_API_KEY_2", kind: "gemini", baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/", model: "gemini-2.0-flash" },
  { envKey: "GEMINI_API_KEY_3", kind: "gemini", baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/", model: "gemini-2.0-flash" },
  { envKey: "MISTRAL_API_KEY_1", kind: "mistral", baseURL: "https://api.mistral.ai/v1", model: "mistral-small-latest" },
  { envKey: "MISTRAL_API_KEY_2", kind: "mistral", baseURL: "https://api.mistral.ai/v1", model: "mistral-small-latest" },
  { envKey: "MISTRAL_API_KEY_3", kind: "mistral", baseURL: "https://api.mistral.ai/v1", model: "mistral-small-latest" },
  { envKey: "CEREBRAS_API_KEY_1", kind: "cerebras", baseURL: "https://api.cerebras.ai/v1", model: "llama-3.3-70b" },
  { envKey: "CEREBRAS_API_KEY_2", kind: "cerebras", baseURL: "https://api.cerebras.ai/v1", model: "llama-3.3-70b" },
  { envKey: "CEREBRAS_API_KEY_3", kind: "cerebras", baseURL: "https://api.cerebras.ai/v1", model: "llama-3.3-70b" },
  { envKey: "COHERE_API_KEY_1", kind: "cohere", baseURL: "https://api.cohere.com/compatibility/v1", model: "command-r-plus-08-2024" },
  { envKey: "COHERE_API_KEY_2", kind: "cohere", baseURL: "https://api.cohere.com/compatibility/v1", model: "command-r-plus-08-2024" },
  { envKey: "COHERE_API_KEY_3", kind: "cohere", baseURL: "https://api.cohere.com/compatibility/v1", model: "command-r-plus-08-2024" },
];

export class AiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiConfigurationError";
  }
}

function readEnvValue(key: string) {
  const raw = process.env[key];
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  return trimmed.replace(/^['"]|['"]$/g, "").trim() || null;
}

export function listAiProviderSlots(): AiProviderSlot[] {
  return AI_KEY_CHAIN.flatMap((entry) => {
    const apiKey = readEnvValue(entry.envKey);
    if (!apiKey) return [];
    return [{ id: entry.envKey, kind: entry.kind, apiKey, baseURL: entry.baseURL, model: entry.model }];
  });
}

function createClient(slot: AiProviderSlot) {
  return new OpenAI({ apiKey: slot.apiKey, baseURL: slot.baseURL });
}

export async function withAiProviderFallback<T>(
  run: (slot: AiProviderSlot, client: OpenAI) => Promise<T>,
): Promise<T> {
  const slots = listAiProviderSlots();
  if (slots.length === 0) {
    throw new AiConfigurationError("No AI API keys are configured.");
  }

  let lastError: unknown;
  for (const slot of slots) {
    try {
      return await run(slot, createClient(slot));
    } catch (error) {
      lastError = error;
      console.warn(`[ai] ${slot.id} failed:`, error instanceof Error ? error.message : error);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("All AI providers failed.");
}

export async function completeChatJson(system: string, user: string) {
  return withAiProviderFallback(async (slot, client) => {
    const response = await client.chat.completions.create({
      model: slot.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const content = response.choices[0]?.message?.content?.trim();
    if (!content) throw new Error(`Empty response from ${slot.id}`);
    return content;
  });
}

export async function streamChatCompletion(
  system: string,
  user: string,
  onDelta: (delta: string) => void | Promise<void>,
) {
  return withAiProviderFallback(async (slot, client) => {
    const stream = await client.chat.completions.create({
      model: slot.model,
      stream: true,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    let fullResponse = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (!delta) continue;
      fullResponse += delta;
      await onDelta(delta);
    }
    if (!fullResponse.trim()) throw new Error(`Empty stream from ${slot.id}`);
    return fullResponse;
  });
}

export function isAiConfigured() {
  return listAiProviderSlots().length > 0;
}

export function listGroqProviderSlots() {
  return listAiProviderSlots().filter((slot) => slot.kind === "groq");
}

/** Thrown when every Groq key is rate limited (HTTP 429). */
export class TranscriptionRateLimitError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super(`Transcription rate limited; retry in ${retryAfterSeconds}s`);
  }
}

export const DEFAULT_TRANSCRIPTION_MODEL = "whisper-large-v3";

export function transcriptionModel() {
  return readEnvValue("GROQ_TRANSCRIPTION_MODEL") ?? DEFAULT_TRANSCRIPTION_MODEL;
}

function errorStatus(error: unknown) {
  return typeof error === "object" && error && "status" in error ? Number((error as { status?: unknown }).status) : undefined;
}

/** Seconds to wait from a 429, using `retry-after` or Groq's reset headers, defaulting to 60. */
export function retryAfterSecondsFromError(error: unknown) {
  const headers = typeof error === "object" && error && "headers" in error ? (error as { headers?: unknown }).headers : undefined;
  const get = (name: string) => {
    if (!headers) return null;
    if (typeof (headers as Headers).get === "function") return (headers as Headers).get(name);
    const value = (headers as Record<string, unknown>)[name];
    return typeof value === "string" ? value : null;
  };
  const retryAfter = Number(get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.ceil(retryAfter);
  return 60;
}

export async function transcribeAudio(
  buffer: Buffer | Uint8Array,
  fileName: string,
  mimeType: string,
  options: { timeoutMs?: number; allowEmpty?: boolean } = {},
) {
  const slots = listGroqProviderSlots();
  if (slots.length === 0) {
    throw new AiConfigurationError("No Groq API keys are configured for transcription.");
  }

  let lastError: unknown;
  let shortestRetry: number | null = null;
  let allRateLimited = true;
  for (const slot of slots) {
    try {
      // No SDK retries: callers run inside short serverless invocations and retry themselves.
      const client = new OpenAI({ apiKey: slot.apiKey, baseURL: slot.baseURL, maxRetries: 0, timeout: options.timeoutMs ?? 50_000 });
      const file = new File([new Uint8Array(buffer)], fileName, { type: mimeType });
      const response = await client.audio.transcriptions.create({
        file,
        model: transcriptionModel(),
        response_format: "text",
        temperature: 0,
      });
      const transcript = typeof response === "string" ? response.trim() : String(response).trim();
      if (!transcript && !options.allowEmpty) throw new Error(`Empty transcript from ${slot.id}`);
      return transcript;
    } catch (error) {
      lastError = error;
      if (errorStatus(error) === 429) {
        const wait = retryAfterSecondsFromError(error);
        shortestRetry = shortestRetry === null ? wait : Math.min(shortestRetry, wait);
      } else {
        allRateLimited = false;
      }
      console.warn(`[ai] transcription ${slot.id} failed:`, error instanceof Error ? error.message : error);
    }
  }

  if (allRateLimited && shortestRetry !== null) throw new TranscriptionRateLimitError(shortestRetry);
  throw lastError instanceof Error ? lastError : new Error("Audio transcription failed.");
}
