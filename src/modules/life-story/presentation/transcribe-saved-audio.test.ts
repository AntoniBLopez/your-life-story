import { describe, expect, it, vi } from "vitest";
import { transcribeSavedAudio, type TranscriptionProgressEvent } from "./transcribe-saved-audio";

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
}

type Step = Response | Error;

/** Fake API: start returns a 3-part job; each segment call consumes the next scripted response. */
function fakeApi(segmentScript: Step[] = [], start: Step | null = null) {
  let done = 0;
  const total = 3;
  const script = [...segmentScript];
  const state = () => (done >= total
    ? { total: 0, done: 0, pendingSegments: [], transcript: "uno dos tres" }
    : { total, done, pendingSegments: Array.from({ length: total - done }, (_, i) => done + i), transcript: null });
  const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
    void init;
    if (url.endsWith("/transcription")) {
      if (start instanceof Error) throw start;
      return start ?? json(state());
    }
    const next = script.shift();
    if (next instanceof Error) throw next;
    if (next) return next;
    done += 1;
    return json(state());
  });
  return { fetchImpl: fetchImpl as unknown as typeof fetch, calls: fetchImpl.mock.calls };
}

const noSleep = vi.fn(async () => {});

describe("transcribeSavedAudio", () => {
  it("drives every segment and reports progress", async () => {
    const api = fakeApi();
    const events: TranscriptionProgressEvent[] = [];
    const result = await transcribeSavedAudio({ attachmentId: "a1", locale: "es", fetchImpl: api.fetchImpl, sleep: noSleep, onProgress: (event) => events.push(event) });
    expect(result).toEqual({ ok: true, transcript: "uno dos tres" });
    expect(events.map((event) => event.done)).toEqual([0, 1, 2, 0]);
    expect(api.calls.map(([url]) => url)).toEqual([
      "/api/attachments/a1/transcription",
      "/api/attachments/a1/transcription/segments/0",
      "/api/attachments/a1/transcription/segments/1",
      "/api/attachments/a1/transcription/segments/2",
    ]);
  });

  it("retries transient failures with backoff", async () => {
    const sleep = vi.fn(async () => {});
    const api = fakeApi([new TypeError("Failed to fetch"), json({ code: "provider_error" }, 502)]);
    const result = await transcribeSavedAudio({ attachmentId: "a1", locale: "es", fetchImpl: api.fetchImpl, sleep });
    expect(result.ok).toBe(true);
    expect(sleep.mock.calls).toEqual([[2000], [6000]]);
  });

  it("stops after three failed attempts with a Spanish message and the progress kept", async () => {
    const api = fakeApi([json({ code: "provider_error" }, 502), json({ code: "provider_error" }, 502), json({ code: "provider_error" }, 502)]);
    const result = await transcribeSavedAudio({ attachmentId: "a1", locale: "es", fetchImpl: api.fetchImpl, sleep: noSleep });
    expect(result).toMatchObject({ ok: false, code: "provider_error", done: 0, total: 3 });
    expect(!result.ok && result.error).toBe("No se pudo transcribir la parte 1 de 3. Lo ya transcrito está guardado; pulsa «Continuar transcripción» para reintentar.");
  });

  it("waits out short rate limits automatically", async () => {
    const sleep = vi.fn(async () => {});
    const api = fakeApi([json({ code: "rate_limited", retryAfterSeconds: 30 }, 429)]);
    const events: TranscriptionProgressEvent[] = [];
    const result = await transcribeSavedAudio({ attachmentId: "a1", locale: "es", fetchImpl: api.fetchImpl, sleep, onProgress: (event) => events.push(event) });
    expect(result.ok).toBe(true);
    expect(sleep).toHaveBeenCalledWith(30_000);
    expect(events.some((event) => event.phase === "waiting")).toBe(true);
  });

  it("stops on long rate limits and says when to continue", async () => {
    const api = fakeApi([json({ code: "rate_limited" }, 429, { "Retry-After": "1800" })]);
    const result = await transcribeSavedAudio({ attachmentId: "a1", locale: "es", fetchImpl: api.fetchImpl, sleep: noSleep });
    expect(result).toMatchObject({ ok: false, code: "rate_limited" });
    if (!result.ok) {
      expect(result.retryAt).toBeInstanceOf(Date);
      expect(result.error).toMatch(/^Se alcanzó el límite del servicio de transcripción \(0 de 3 partes hechas\)\. Pulsa «Continuar transcripción» a partir de las \d\d:\d\d\.$/);
    }
  });

  it("does not retry permanent errors", async () => {
    const api = fakeApi([], json({ code: "consent_required" }, 403));
    const result = await transcribeSavedAudio({ attachmentId: "a1", locale: "es", fetchImpl: api.fetchImpl, sleep: noSleep });
    expect(result).toMatchObject({ ok: false, code: "consent_required", error: "Activa el consentimiento de IA en Reflexionar o Ajustes para transcribir audio." });
    expect(api.calls).toHaveLength(1);
  });

  it("passes restart to the server", async () => {
    const api = fakeApi();
    await transcribeSavedAudio({ attachmentId: "a1", locale: "en", restart: true, fetchImpl: api.fetchImpl, sleep: noSleep });
    expect(JSON.parse(String(api.calls[0]![1]?.body))).toEqual({ restart: true });
  });
});
