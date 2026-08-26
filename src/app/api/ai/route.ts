import { createHash } from "node:crypto";
import OpenAI from "openai";
import { NextRequest } from "next/server";
import { env } from "@/shared/lib/env";
import { getCurrentUser } from "@/shared/lib/auth";
import { listLifeEntriesForUser } from "@/modules/life-story/application/life-story-service";
import { buildReflectionContext } from "@/modules/reflection/application/reflection-context";
import { ensureReflectionThread, getReflectionState, saveReflectionMessage } from "@/modules/reflection/application/reflection-service";
import { crisisSupportMessage, reflectionInstructions, requiresImmediateSupport } from "@/modules/reflection/domain/reflection-policy";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { message?: unknown; locale?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const locale = body?.locale === "en" ? "en" : "es";
  if (!message || message.length > 4000) return Response.json({ error: "Invalid message" }, { status: 400 });

  const reflection = await getReflectionState(user.id);
  if (!reflection.consented) return Response.json({ error: "AI consent required" }, { status: 403 });
  const threadId = await ensureReflectionThread(user.id);
  await saveReflectionMessage(user.id, threadId, "user", message);

  if (requiresImmediateSupport(message)) {
    const response = crisisSupportMessage(locale);
    await saveReflectionMessage(user.id, threadId, "assistant", response);
    return new Response(response, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  if (!env.openAiApiKey) return Response.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });

  const entries = await listLifeEntriesForUser(user.id);
  const context = buildReflectionContext(entries, locale);
  const conversation = reflection.messages.slice(-12).map((item) => `${item.role === "user" ? "USER" : "ASSISTANT"}: ${item.content}`).join("\n");
  const client = new OpenAI({ apiKey: env.openAiApiKey });
  const stream = await client.responses.create({
    model: env.openAiModel,
    stream: true,
    store: false,
    safety_identifier: createHash("sha256").update(user.id).digest("hex"),
    instructions: `${reflectionInstructions}\n\n${context}\n\nPREVIOUS CHAT:\n${conversation || "(none)"}`,
    input: message,
  });

  const encoder = new TextEncoder(); let fullResponse = "";
  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "response.output_text.delta") { fullResponse += event.delta; controller.enqueue(encoder.encode(event.delta)); }
        }
        if (fullResponse) await saveReflectionMessage(user.id, threadId, "assistant", fullResponse);
      } catch {
        controller.enqueue(encoder.encode(locale === "es" ? "\n\nNo he podido completar esta reflexión. Inténtalo de nuevo en un momento." : "\n\nI could not complete this reflection. Please try again in a moment."));
      } finally { controller.close(); }
    },
  });
  return new Response(responseStream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
