import { NextRequest } from "next/server";
import {
  entryDictationInstructions,
  parseEntryDictationResponse,
} from "@/modules/life-story/domain/entry-dictation-prompt";
import { getReflectionState } from "@/modules/reflection/application/reflection-service";
import { getCurrentUser } from "@/shared/lib/auth";
import { completeChatJson, isAiConfigured } from "@/shared/lib/ai-providers";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    transcript?: unknown;
    locale?: unknown;
  } | null;

  const transcript = typeof body?.transcript === "string" ? body.transcript.trim() : "";
  const locale = body?.locale === "en" ? "en" : "es";

  if (!transcript || transcript.length < 20) {
    return Response.json({
      error: locale === "es" ? "La transcripción es demasiado corta." : "Transcript is too short.",
    }, { status: 400 });
  }
  if (transcript.length > 8000) {
    return Response.json({ error: "Transcript too long" }, { status: 400 });
  }

  const reflection = await getReflectionState(user.id);
  if (!reflection.consented) {
    return Response.json({
      error: locale === "es"
        ? "Activa el consentimiento de IA en Reflexionar o Ajustes para usar esta función."
        : "Enable AI consent in Reflect or Settings to use this feature.",
      code: "consent_required",
    }, { status: 403 });
  }

  if (!isAiConfigured()) {
    return Response.json({ error: "AI is not configured" }, { status: 503 });
  }

  try {
    const raw = await completeChatJson(entryDictationInstructions(locale), transcript);
    const result = parseEntryDictationResponse(raw);
    return Response.json(result);
  } catch {
    return Response.json({
      error: locale === "es"
        ? "No se pudo organizar la experiencia. Inténtalo de nuevo."
        : "Could not organize the experience. Please try again.",
    }, { status: 500 });
  }
}
