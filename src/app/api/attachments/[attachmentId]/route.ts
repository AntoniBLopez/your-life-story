import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/shared/lib/auth";
import { getAttachmentById, openAttachmentStream } from "@/shared/lib/mongodb/attachments";

export async function GET(request: NextRequest, { params }: { params: Promise<{ attachmentId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { attachmentId } = await params;
  const attachment = await getAttachmentById(user.id, attachmentId);
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
