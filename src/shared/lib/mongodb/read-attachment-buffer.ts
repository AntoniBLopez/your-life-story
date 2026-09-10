import { openAttachmentStream } from "@/shared/lib/mongodb/attachments";

export async function readAttachmentBuffer(gridFsId: string) {
  const stream = await openAttachmentStream(gridFsId);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
