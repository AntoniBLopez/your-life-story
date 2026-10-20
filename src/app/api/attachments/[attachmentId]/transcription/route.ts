import { startAttachmentTranscription } from "@/modules/life-story/application/transcription-service";
import { withTranscriptionUser } from "./respond";

export const runtime = "nodejs";

/** Starts or resumes the transcription of a saved audio. Body (optional): { restart?: boolean }. */
export async function POST(request: Request, { params }: { params: Promise<{ attachmentId: string }> }) {
  const { attachmentId } = await params;
  const body = await request.json().catch(() => null) as { restart?: unknown } | null;
  return withTranscriptionUser((userId) => startAttachmentTranscription(userId, attachmentId, { restart: body?.restart === true }));
}
