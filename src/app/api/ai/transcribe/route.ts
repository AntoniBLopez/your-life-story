import { NextRequest } from "next/server";
import { getReflectionState } from "@/modules/reflection/application/reflection-service";
import { getCurrentUser } from "@/shared/lib/auth";
import { isAiConfigured, listGroqProviderSlots, transcribeAudio } from "@/shared/lib/ai-providers";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    audioBase64?: unknown;
    fileName?: unknown;
    mimeType?: unknown;
    locale?: unknown;
  } | null;

  const audioBase64 = typeof body?.audioBase64 === "string" ? body.audioBase64.trim() : "";
  const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "recording.webm";
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType.trim() : "audio/webm";
  const locale = body?.locale === "en" ? "en" : "es";

  if (!audioBase64) {
    return Response.json({ error: locale === "es" ? "No se recibió audio." : "No audio received." }, { status: 400 });
  }

  const reflection = await getReflectionState(user.id);
  if (!reflection.consented) {
    return Response.json({
      error: locale === "es"
        ? "Activa el consentimiento de IA en Reflexionar o Ajustes para transcribir audio."
        : "Enable AI consent in Reflect or Settings to transcribe audio.",
      code: "consent_required",
    }, { status: 403 });
  }

  if (!isAiConfigured() || listGroqProviderSlots().length === 0) {
    return Response.json({ error: "Transcription is not configured" }, { status: 503 });
  }

  const buffer = Buffer.from(audioBase64, "base64");
  if (buffer.byteLength > MAX_AUDIO_BYTES) {
    return Response.json({
      error: locale === "es" ? "El audio es demasiado largo (máx. 15 MB)." : "Audio is too large (max 15 MB).",
    }, { status: 400 });
  }

  try {
    const transcript = await transcribeAudio(buffer, fileName, mimeType, locale);
    return Response.json({ transcript });
  } catch {
    return Response.json({
      error: locale === "es"
        ? "No se pudo transcribir el audio. Inténtalo de nuevo."
        : "Could not transcribe the audio. Please try again.",
    }, { status: 500 });
  }
}
