import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/shared/lib/auth";
import { parseByteRange } from "@/shared/lib/http-range";
import {
  findAttachmentById,
  getAttachmentById,
  getAttachmentFileLength,
  openAttachmentStream,
} from "@/shared/lib/mongodb/attachments";
import { findPublishedOwnerByAttachment } from "@/modules/archive/infrastructure/mongo-archive-repository";

export const runtime = "nodejs";

function attachmentHeaders(attachment: { mimeType: string; fileName: string }) {
  return {
    "Content-Type": attachment.mimeType,
    "Content-Disposition": `inline; filename="${attachment.fileName}"`,
    "Accept-Ranges": "bytes",
  };
}

// Streamed (not buffered) so files above Vercel's 4.5 MB response limit can be served.
function streamBody(stream: Awaited<ReturnType<typeof openAttachmentStream>>) {
  return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ attachmentId: string }> }) {
  const { attachmentId } = await params;
  const user = await getCurrentUser();
  const owned = user ? await getAttachmentById(user.id, attachmentId) : null;
  const publicAttachment = owned ? null : await findAttachmentById(attachmentId);
  const published = publicAttachment ? await findPublishedOwnerByAttachment(publicAttachment) : null;
  const attachment = owned ?? (published ? publicAttachment : null);
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const size = await getAttachmentFileLength(attachment.gridFsId);
  if (size === null) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const range = parseByteRange(request.headers.get("range"), size);
  const headers = attachmentHeaders(attachment);

  if (!range) {
    const stream = await openAttachmentStream(attachment.gridFsId);
    return new NextResponse(streamBody(stream), {
      headers: {
        ...headers,
        "Content-Length": String(size),
      },
    });
  }

  const length = range.end - range.start + 1;
  const stream = await openAttachmentStream(attachment.gridFsId, range);
  return new NextResponse(streamBody(stream), {
    status: 206,
    headers: {
      ...headers,
      "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
      "Content-Length": String(length),
    },
  });
}
