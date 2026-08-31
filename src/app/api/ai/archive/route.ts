import { NextRequest } from "next/server";
import { findPublishedProfileBySlug } from "@/modules/archive/infrastructure/mongo-archive-repository";
import { archiveHistorianInstructions } from "@/modules/archive/domain/archive-prompt";
import { buildReflectionContext } from "@/modules/reflection/application/reflection-context";
import { crisisSupportMessage, requiresImmediateSupport } from "@/modules/reflection/domain/reflection-policy";
import { isAiConfigured, streamChatCompletion } from "@/shared/lib/ai-providers";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { message?: unknown; locale?: unknown; slug?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
  const locale = body?.locale === "en" ? "en" : "es";
  if (!message || message.length > 4000 || !slug) return Response.json({ error: "Invalid request" }, { status: 400 });

  const life = await findPublishedProfileBySlug(slug);
  if (!life) return Response.json({ error: "Not found" }, { status: 404 });

  if (requiresImmediateSupport(message)) {
    return new Response(crisisSupportMessage(locale), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  if (!isAiConfigured()) {
    return Response.json({ error: "No AI API keys are configured" }, { status: 503 });
  }

  const history = buildReflectionContext(life.entries, locale);
  const familyLines = life.family.people.map((person) => {
    return `- ${person.fullName}${person.isSubject ? " (subject)" : ""}${person.birthDate ? ` b.${person.birthDate}` : ""}${person.deathDate ? ` d.${person.deathDate}` : ""}${person.notes ? ` | ${person.notes}` : ""}`;
  });
  const family = familyLines.length
    ? `${locale === "es" ? "FAMILIA" : "FAMILY"}\n${familyLines.join("\n")}`
    : locale === "es" ? "FAMILIA: no hay datos." : "FAMILY: none recorded.";
  const status = life.deceasedAt
    ? (locale === "es" ? `Esta persona está marcada como fallecida (${life.deceasedAt.slice(0, 10)}).` : `This person is marked as deceased (${life.deceasedAt.slice(0, 10)}).`)
    : (locale === "es" ? "Esta persona publicó su vida en vida." : "This person published their life while living.");
  const instructions = `${archiveHistorianInstructions}\n\nPERSON: ${life.displayName}\n${status}\n\n${history}\n\n${family}`;

  const encoder = new TextEncoder();
  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await streamChatCompletion(instructions, message, (delta) => {
          controller.enqueue(encoder.encode(delta));
        });
      } catch {
        controller.enqueue(encoder.encode(locale === "es" ? "\n\nNo he podido completar esta consulta. Inténtalo de nuevo en un momento." : "\n\nI could not complete this question. Please try again in a moment."));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(responseStream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
