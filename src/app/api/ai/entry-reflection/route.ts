import { NextRequest } from "next/server";
import {
  buildEntryReflectionInput,
  entryReflectionInstructions,
  parseEntryReflectionResponse,
} from "@/modules/life-story/domain/entry-reflection-prompt";
import { getReflectionState } from "@/modules/reflection/application/reflection-service";
import { crisisSupportMessage, requiresImmediateSupport } from "@/modules/reflection/domain/reflection-policy";
import { getCurrentUser } from "@/shared/lib/auth";
import { completeChatJson, isAiConfigured } from "@/shared/lib/ai-providers";

export const runtime = "nodejs";

const MIN_NARRATIVE_LENGTH = 20;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    narrative?: unknown;
    title?: unknown;
    locale?: unknown;
  } | null;

  const narrative = typeof body?.narrative === "string" ? body.narrative.trim() : "";
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const locale = body?.locale === "en" ? "en" : "es";

  if (!narrative || narrative.length < MIN_NARRATIVE_LENGTH) {
    return Response.json({
      error: locale === "es"
        ? "Escribe al menos unas líneas en «Qué ocurrió» antes de generar."
        : "Write at least a few lines in «What happened» before generating.",
    }, { status: 400 });
  }
  if (narrative.length > 4000) {
    return Response.json({ error: "Invalid narrative" }, { status: 400 });
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

  if (requiresImmediateSupport(narrative)) {
    return Response.json({
      error: crisisSupportMessage(locale),
      code: "crisis",
    }, { status: 422 });
  }

  if (!isAiConfigured()) {
    return Response.json({ error: "No AI API keys are configured" }, { status: 503 });
  }

  try {
    const raw = await completeChatJson(
      entryReflectionInstructions(locale),
      buildEntryReflectionInput(title, narrative),
    );
    const result = parseEntryReflectionResponse(raw);
    return Response.json(result);
  } catch {
    return Response.json({
      error: locale === "es"
        ? "No se pudo generar la reflexión. Inténtalo de nuevo en un momento."
        : "Could not generate the reflection. Please try again in a moment.",
    }, { status: 500 });
  }
}
