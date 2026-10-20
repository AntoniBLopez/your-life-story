import { transcribeAttachmentSegment } from "@/modules/life-story/application/transcription-service";
import { withTranscriptionUser } from "../../respond";

export const runtime = "nodejs";
// One ~6 MB segment: GridFS range read + Groq Whisper (≈26 min of audio in ~10–20 s).
export const maxDuration = 60;

export async function POST(_request: Request, { params }: { params: Promise<{ attachmentId: string; index: string }> }) {
  const { attachmentId, index } = await params;
  return withTranscriptionUser((userId) => transcribeAttachmentSegment(userId, attachmentId, index));
}
