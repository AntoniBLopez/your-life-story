import { finishAttachmentUpload } from "@/modules/life-story/application/attachment-upload-service";
import { withUploadUser } from "../../respond";

export const runtime = "nodejs";

/** Publishes the attachment once every part has been received. */
export async function POST(_request: Request, { params }: { params: Promise<{ uploadId: string }> }) {
  const { uploadId } = await params;
  return withUploadUser((userId) => finishAttachmentUpload(userId, uploadId));
}
