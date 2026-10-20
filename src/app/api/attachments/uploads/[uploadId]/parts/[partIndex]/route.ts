import { receiveAttachmentUploadPart } from "@/modules/life-story/application/attachment-upload-service";
import { ATTACHMENT_UPLOAD_PART_BYTES } from "@/modules/life-story/domain/attachment-upload";
import { withUploadUser } from "../../../respond";

export const runtime = "nodejs";

/** Receives one raw binary part (application/octet-stream, at most ATTACHMENT_UPLOAD_PART_BYTES). */
export async function PUT(request: Request, { params }: { params: Promise<{ uploadId: string; partIndex: string }> }) {
  const { uploadId, partIndex } = await params;
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > ATTACHMENT_UPLOAD_PART_BYTES) return Response.json({ code: "bad_part" }, { status: 413 });

  const part = new Uint8Array(await request.arrayBuffer());
  if (part.byteLength > ATTACHMENT_UPLOAD_PART_BYTES) return Response.json({ code: "bad_part" }, { status: 413 });
  return withUploadUser((userId) => receiveAttachmentUploadPart(userId, uploadId, partIndex, part));
}
