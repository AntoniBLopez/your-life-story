import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/shared/lib/auth";
import { findAttachmentById, getAttachmentById, openAttachmentStream } from "@/shared/lib/mongodb/attachments";
import { findPublishedOwnerByAttachment } from "@/modules/archive/infrastructure/mongo-archive-repository";

export async function GET(request: NextRequest, { params }: { params: Promise<{ attachmentId: string }> }) {
  const { attachmentId } = await params;
  const user = await getCurrentUser();
  const owned = user ? await getAttachmentById(user.id, attachmentId) : null;
  const publicAttachment = owned ? null : await findAttachmentById(attachmentId);
  const published = publicAttachment ? await findPublishedOwnerByAttachment(publicAttachment) : null;
  const attachment = owned ?? (published ? publicAttachment : null);
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const stream = await openAttachmentStream(attachment.gridFsId);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks);

  return new NextResponse(body, {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `inline; filename="${attachment.fileName}"`,
      "Content-Length": String(body.byteLength),
    },
  });
}
