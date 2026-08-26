import { GridFSBucket, ObjectId } from "mongodb";
import { getDb } from "@/shared/lib/mongodb/client";
import { COLLECTIONS, GRIDFS_BUCKET } from "@/shared/lib/mongodb/collections";

export type AttachmentRecord = {
  id: string;
  userId: string;
  entryId: string;
  storagePath: string;
  gridFsId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
};

function getBucket() {
  return new GridFSBucket(getDb() as unknown as import("mongodb").Db, { bucketName: GRIDFS_BUCKET });
}

export async function listAttachmentsForEntry(userId: string, entryId: string) {
  const db = await getDb();
  return db.collection<AttachmentRecord>(COLLECTIONS.entryAttachments).find({ userId, entryId }).toArray();
}

export async function listAttachmentsForUser(userId: string) {
  const db = await getDb();
  return db.collection<AttachmentRecord>(COLLECTIONS.entryAttachments).find({ userId }).toArray();
}

export async function deleteAttachmentsForEntry(userId: string, entryId: string) {
  const db = await getDb();
  const attachments = await listAttachmentsForEntry(userId, entryId);
  const bucket = new GridFSBucket(db, { bucketName: GRIDFS_BUCKET });
  for (const attachment of attachments) {
    try {
      await bucket.delete(new ObjectId(attachment.gridFsId));
    } catch {
      // File may already be missing.
    }
  }
  await db.collection(COLLECTIONS.entryAttachments).deleteMany({ userId, entryId });
}

export async function deleteAllUserAttachments(userId: string) {
  const db = await getDb();
  const attachments = await listAttachmentsForUser(userId);
  const bucket = new GridFSBucket(db, { bucketName: GRIDFS_BUCKET });
  for (const attachment of attachments) {
    try {
      await bucket.delete(new ObjectId(attachment.gridFsId));
    } catch {
      // File may already be missing.
    }
  }
  await db.collection(COLLECTIONS.entryAttachments).deleteMany({ userId });
}

export async function storeAttachment(input: {
  userId: string;
  entryId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
}) {
  const db = await getDb();
  const bucket = new GridFSBucket(db, { bucketName: GRIDFS_BUCKET });
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
  const storagePath = `${input.userId}/${input.entryId}/${crypto.randomUUID()}-${safeName}`;
  const gridFsId = new ObjectId();

  await new Promise<void>((resolve, reject) => {
    const stream = bucket.openUploadStreamWithId(gridFsId, storagePath, {
      contentType: input.mimeType,
      metadata: { userId: input.userId, entryId: input.entryId },
    });
    stream.on("error", reject);
    stream.on("finish", () => resolve());
    stream.end(input.buffer);
  });

  const record: AttachmentRecord = {
    id: crypto.randomUUID(),
    userId: input.userId,
    entryId: input.entryId,
    storagePath,
    gridFsId: gridFsId.toString(),
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    createdAt: new Date(),
  };
  await db.collection(COLLECTIONS.entryAttachments).insertOne(record);
  return record;
}

export async function getAttachmentById(userId: string, attachmentId: string) {
  const db = await getDb();
  return db.collection<AttachmentRecord>(COLLECTIONS.entryAttachments).findOne({ id: attachmentId, userId });
}

export async function openAttachmentStream(gridFsId: string) {
  const db = await getDb();
  const bucket = new GridFSBucket(db, { bucketName: GRIDFS_BUCKET });
  return bucket.openDownloadStream(new ObjectId(gridFsId));
}
