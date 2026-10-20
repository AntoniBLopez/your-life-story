import { cancelAttachmentUpload } from "@/modules/life-story/application/attachment-upload-service";
import { withUploadUser } from "../respond";

export const runtime = "nodejs";

/** Cancels an unfinished upload and discards the parts received so far. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ uploadId: string }> }) {
  const { uploadId } = await params;
  return withUploadUser((userId) => cancelAttachmentUpload(userId, uploadId));
}
