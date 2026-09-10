import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/shared/lib/auth";
import { parseByteRange } from "@/shared/lib/http-range";
import { findAttachmentById, getAttachmentById } from "@/shared/lib/mongodb/attachments";
import { readAttachmentBuffer } from "@/shared/lib/mongodb/read-attachment-buffer";
import { findPublishedOwnerByAttachment } from "@/modules/archive/infrastructure/mongo-archive-repository";

function attachmentHeaders(attachment: { mimeType: string; fileName: string }) {
  return {
    "Content-Type": attachment.mimeType,
    "Content-Disposition": `inline; filename="${attachment.fileName}"`,
    "Accept-Ranges": "bytes",
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ attachmentId: string }> }) {
  const { attachmentId } = await params;
  const user = await getCurrentUser();
  const owned = user ? await getAttachmentById(user.id, attachmentId) : null;
  const publicAttachment = owned ? null : await findAttachmentById(attachmentId);
  const published = publicAttachment ? await findPublishedOwnerByAttachment(publicAttachment) : null;
  const attachment = owned ?? (published ? publicAttachment : null);
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await readAttachmentBuffer(attachment.gridFsId);
  const size = body.byteLength;
  const range = parseByteRange(request.headers.get("range"), size);
  const headers = attachmentHeaders(attachment);

  if (!range) {
    return new NextResponse(body, {
      headers: {
        ...headers,
        "Content-Length": String(size),
      },
    });
  }

  const slice = body.subarray(range.start, range.end + 1);
  return new NextResponse(slice, {
    status: 206,
    headers: {
      ...headers,
      "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
      "Content-Length": String(slice.byteLength),
    },
  });
}
