import { isTranscriptionErrorCode, type TranscriptionErrorCode } from "@/modules/life-story/application/transcription-errors";

type Locale = "es" | "en";
type State = { total: number; done: number; pendingSegments: number[]; transcript: string | null };
type FailureCode = TranscriptionErrorCode | "network";

export type TranscriptionProgressEvent =
  | { phase: "transcribing"; done: number; total: number }
  | { phase: "waiting"; done: number; total: number; resumeAt: Date };

export type TranscribeSavedAudioResult =
  | { ok: true; transcript: string }
  | { ok: false; code: FailureCode; error: string; done: number; total: number; retryAt?: Date };

export type TranscribeSavedAudioInput = {
  attachmentId: string;
  locale: Locale;
  restart?: boolean;
  onProgress?: (event: TranscriptionProgressEvent) => void;
  signal?: AbortSignal;
  /** Rate-limit pauses up to this long are waited out automatically. */
  maxAutoWaitSeconds?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

const ATTEMPTS_PER_SEGMENT = 3;
const RETRY_DELAYS_MS = [2_000, 6_000];
const RETRYABLE: FailureCode[] = ["network", "provider_error", "server_error"];

function formatTime(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function transcriptionErrorMessage(code: FailureCode, locale: Locale, context: { done: number; total: number; retryAt?: Date }) {
  const progress = context.total > 0 ? context.done : 0;
  if (locale === "en") {
    switch (code) {
      case "consent_required": return "Enable AI consent in Reflect or Settings to transcribe audio.";
      case "not_configured": return "Transcription isn't available right now.";
      case "unsupported_audio":
      case "not_audio": return "We couldn't read this audio to transcribe it. Supported: mp3, m4a, wav, webm or ogg.";
      case "not_found": return "The audio was not found.";
      case "unauthorized": return "Your session has expired. Sign in again and retry.";
      case "rate_limited": return `The transcription provider's limit was reached (${progress} of ${context.total} parts done). Press “Continue transcription”${context.retryAt ? ` after ${formatTime(context.retryAt, locale)}` : " later"}.`;
      default: return `Could not transcribe part ${Math.min(progress + 1, context.total)} of ${context.total}. What's done is saved; press “Continue transcription” to retry.`;
    }
  }
  switch (code) {
    case "consent_required": return "Activa el consentimiento de IA en Reflexionar o Ajustes para transcribir audio.";
    case "not_configured": return "La transcripción no está disponible ahora mismo.";
    case "unsupported_audio":
    case "not_audio": return "No pudimos leer este audio para transcribirlo. Formatos admitidos: mp3, m4a, wav, webm u ogg.";
    case "not_found": return "No se encontró el audio.";
    case "unauthorized": return "Tu sesión ha caducado. Vuelve a iniciar sesión e inténtalo de nuevo.";
    case "rate_limited": return `Se alcanzó el límite del servicio de transcripción (${progress} de ${context.total} partes hechas). Pulsa «Continuar transcripción»${context.retryAt ? ` a partir de las ${formatTime(context.retryAt, locale)}` : " más tarde"}.`;
    default: return `No se pudo transcribir la parte ${Math.min(progress + 1, context.total)} de ${context.total}. Lo ya transcrito está guardado; pulsa «Continuar transcripción» para reintentar.`;
  }
}

type CallResult = { ok: true; state: State } | { ok: false; code: FailureCode; retryAfterSeconds?: number };

async function call(fetchImpl: typeof fetch, url: string, body: unknown, signal?: AbortSignal): Promise<CallResult> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
      signal,
    });
  } catch {
    return { ok: false, code: "network" };
  }
  const data = await response.json().catch(() => null) as (State & { code?: unknown; retryAfterSeconds?: unknown }) | null;
  if (response.ok && data && Array.isArray(data.pendingSegments)) return { ok: true, state: data };
  const code: FailureCode = isTranscriptionErrorCode(data?.code) ? data.code : response.status === 429 ? "rate_limited" : "server_error";
  const retryAfter = Number(data?.retryAfterSeconds ?? response.headers.get("retry-after"));
  return { ok: false, code, retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined };
}

/**
 * Drives the server-side segmented transcription of a saved audio, one short request per
 * segment. Progress lives on the server, so calling it again resumes where it stopped.
 * Never throws.
 */
export async function transcribeSavedAudio(input: TranscribeSavedAudioInput): Promise<TranscribeSavedAudioResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const sleep = input.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const maxAutoWait = input.maxAutoWaitSeconds ?? 90;
  const base = `/api/attachments/${input.attachmentId}/transcription`;
  let state: State = { total: 0, done: 0, pendingSegments: [], transcript: null };

  const failure = (code: FailureCode, retryAt?: Date): TranscribeSavedAudioResult => ({
    ok: false,
    code,
    retryAt,
    done: state.done,
    total: state.total,
    error: transcriptionErrorMessage(code, input.locale, { done: state.done, total: state.total, retryAt }),
  });

  const started = await call(fetchImpl, base, { restart: input.restart === true }, input.signal);
  if (!started.ok) return failure(started.code);
  state = started.state;
  input.onProgress?.({ phase: "transcribing", done: state.done, total: state.total });

  while (state.pendingSegments.length > 0) {
    if (input.signal?.aborted) return failure("network");
    const index = state.pendingSegments[0]!;
    let attempt = 0;
    for (;;) {
      const result = await call(fetchImpl, `${base}/segments/${index}`, {}, input.signal);
      if (result.ok) {
        state = result.state;
        input.onProgress?.({ phase: "transcribing", done: state.done, total: state.total });
        break;
      }
      if (result.code === "rate_limited") {
        const waitSeconds = result.retryAfterSeconds ?? 60;
        const resumeAt = new Date(Date.now() + waitSeconds * 1000);
        if (waitSeconds > maxAutoWait) return failure("rate_limited", resumeAt);
        input.onProgress?.({ phase: "waiting", done: state.done, total: state.total, resumeAt });
        await sleep(waitSeconds * 1000);
        continue;
      }
      attempt += 1;
      if (!RETRYABLE.includes(result.code) || attempt >= ATTEMPTS_PER_SEGMENT) return failure(result.code);
      await sleep(RETRY_DELAYS_MS[attempt - 1] ?? 6_000);
    }
  }

  return { ok: true, transcript: state.transcript ?? "" };
}
