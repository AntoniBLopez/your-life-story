import { startAttachmentUpload } from "@/modules/life-story/application/attachment-upload-service";
import { withUploadUser } from "./respond";

export const runtime = "nodejs";

/** Starts a chunked attachment upload. Body: { entryId, fileName, contentType, size, fieldKey?, transcript? }. */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  return withUploadUser((userId) => startAttachmentUpload(userId, body));
}
