import type { TranscriptionResult } from "@/modules/life-story/application/transcription-service";
import { getCurrentUser } from "@/shared/lib/auth";

export async function withTranscriptionUser(handler: (userId: string) => Promise<TranscriptionResult>) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ code: "unauthorized" }, { status: 401 });
  try {
    const result = await handler(user.id);
    if (result.ok) return Response.json(result.data);
    const headers = result.retryAfterSeconds ? { "Retry-After": String(result.retryAfterSeconds) } : undefined;
    return Response.json({ code: result.code, retryAfterSeconds: result.retryAfterSeconds }, { status: result.status, headers });
  } catch (error) {
    console.error("[transcription]", error);
    return Response.json({ code: "server_error" }, { status: 500 });
  }
}
