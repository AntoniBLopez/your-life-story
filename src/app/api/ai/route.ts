import { NextRequest } from "next/server";
import { beginReflectionTurn, finishReflectionTurn } from "@/modules/reflection/application/reflection-turn";
import { reflectionChatRequestSchema } from "@/modules/reflection/application/reflection-schemas";
import { reflectionCopy } from "@/modules/reflection/domain/reflection-copy";
import { getCurrentUser } from "@/shared/lib/auth";
import { streamChatCompletion } from "@/shared/lib/ai-providers";

export const runtime = "nodejs";

function turnHeaders(chatId: string, title: string) {
  return {
    "x-reflection-chat-id": chatId,
    "x-reflection-chat-title": encodeURIComponent(title),
    "Cache-Control": "no-store",
  };
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = reflectionChatRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid message" }, { status: 400 });

  const turn = await beginReflectionTurn(user.id, parsed.data);
  if (turn.type === "rejected") return Response.json({ error: turn.error }, { status: turn.status });

  const headers = turnHeaders(turn.chatId, turn.title);
  if (turn.type === "crisis") {
    return new Response(turn.response, { headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" } });
  }
  if (turn.type === "unavailable") return Response.json({ error: turn.error }, { status: 503, headers });

  const encoder = new TextEncoder();
  let fullResponse = "";
  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        fullResponse = await streamChatCompletion(turn.instructions, turn.message, (delta) => {
          controller.enqueue(encoder.encode(delta));
        });
      } catch {
        const incomplete = reflectionCopy(turn.locale).incomplete;
        controller.enqueue(encoder.encode(`\n\n${incomplete}`));
        fullResponse = "";
      }
      try {
        if (fullResponse) await finishReflectionTurn(user.id, turn.chatId, fullResponse, turn.locale);
      } catch (error) {
        console.error("[reflect] finish turn", error);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(responseStream, {
    headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
  });
}
