import { GridFSBucket, ObjectId, type ObjectId as MongoObjectId } from "mongodb";
import { getDb } from "@/shared/lib/mongodb/client";
import { COLLECTIONS, GRIDFS_BUCKET } from "@/shared/lib/mongodb/collections";
import { idFromDocument, toObjectId } from "@/shared/lib/mongodb/id";

type AttachmentDbRecord = {
  _id: MongoObjectId;
  userId: string;
  entryId: string;
  storagePath: string;
  gridFsId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  fieldKey?: string | null;
  transcript?: string | null;
  createdAt: Date;
};

export type AttachmentRecord = {
  id: string;
  userId: string;
  entryId: string;
  storagePath: string;
  gridFsId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  fieldKey: string | null;
  transcript: string | null;
  createdAt: Date;
};

function mapAttachment(record: AttachmentDbRecord): AttachmentRecord {
  return {
    id: idFromDocument(record),
    userId: record.userId,
    entryId: record.entryId,
    storagePath: record.storagePath,
    gridFsId: record.gridFsId,
    fileName: record.fileName,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
    fieldKey: record.fieldKey ?? null,
    transcript: record.transcript ?? null,
    createdAt: record.createdAt,
  };
}

export async function listAttachmentsForEntry(userId: string, entryId: string) {
  const db = await getDb();
  const rows = await db.collection<AttachmentDbRecord>(COLLECTIONS.entryAttachments).find({ userId, entryId }).toArray();
  return rows.map(mapAttachment);
}

export async function listAttachmentsForUser(userId: string) {
  const db = await getDb();
  const rows = await db.collection<AttachmentDbRecord>(COLLECTIONS.entryAttachments).find({ userId }).toArray();
  return rows.map(mapAttachment);
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
  fieldKey?: string | null;
  transcript?: string | null;
}) {
  const db = await getDb();
  const bucket = new GridFSBucket(db, { bucketName: GRIDFS_BUCKET });
  const storagePath = `${input.userId}/${input.entryId}/${crypto.randomUUID()}-${safeStorageName(input.fileName)}`;

  const gridFsId = await new Promise<string>((resolve, reject) => {
    const stream = bucket.openUploadStream(storagePath, {
      metadata: { userId: input.userId, entryId: input.entryId, contentType: input.mimeType },
    });
    stream.on("error", reject);
    stream.on("finish", () => resolve(stream.id.toString()));
    stream.end(input.buffer);
  });

  return recordStoredAttachment({
    userId: input.userId,
    entryId: input.entryId,
    storagePath,
    gridFsId: gridFsId.toString(),
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    fieldKey: input.fieldKey,
    transcript: input.transcript,
  });
}

export function safeStorageName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

/** Inserts the attachment record for a file that is already stored in GridFS. */
export async function recordStoredAttachment(input: {
  userId: string;
  entryId: string;
  storagePath: string;
  gridFsId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  fieldKey?: string | null;
  transcript?: string | null;
}) {
  const db = await getDb();
  const record = {
    userId: input.userId,
    entryId: input.entryId,
    storagePath: input.storagePath,
    gridFsId: input.gridFsId,
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    fieldKey: input.fieldKey ?? null,
    transcript: input.transcript ?? null,
    createdAt: new Date(),
  };
  const { insertedId } = await db.collection(COLLECTIONS.entryAttachments).insertOne(record);
  return mapAttachment({ _id: insertedId, ...record });
}

export async function deleteAttachmentById(userId: string, attachmentId: string) {
  const db = await getDb();
  const record = await db.collection<AttachmentDbRecord>(COLLECTIONS.entryAttachments).findOne({
    _id: toObjectId(attachmentId),
    userId,
  });
  if (!record) return null;

  const bucket = new GridFSBucket(db, { bucketName: GRIDFS_BUCKET });
  try {
    await bucket.delete(new ObjectId(record.gridFsId));
  } catch {
    // File may already be missing.
  }
  await db.collection(COLLECTIONS.entryAttachments).deleteOne({ _id: toObjectId(attachmentId), userId });
  return mapAttachment(record);
}

export async function getAttachmentById(userId: string, attachmentId: string) {
  const db = await getDb();
  const record = await db.collection<AttachmentDbRecord>(COLLECTIONS.entryAttachments).findOne({ _id: toObjectId(attachmentId), userId });
  return record ? mapAttachment(record) : null;
}

export async function findAttachmentById(attachmentId: string) {
  const db = await getDb();
  const record = await db.collection<AttachmentDbRecord>(COLLECTIONS.entryAttachments).findOne({ _id: toObjectId(attachmentId) });
  return record ? mapAttachment(record) : null;
}

export async function openAttachmentStream(gridFsId: string, range?: { start: number; end: number }) {
  const db = await getDb();
  const bucket = new GridFSBucket(db, { bucketName: GRIDFS_BUCKET });
  // GridFS `end` is exclusive; HTTP ranges are inclusive.
  return bucket.openDownloadStream(new ObjectId(gridFsId), range ? { start: range.start, end: range.end + 1 } : undefined);
}

/** Size in bytes of a stored GridFS file, or null when it is missing. */
export async function getAttachmentFileLength(gridFsId: string) {
  const db = await getDb();
  const file = await db
    .collection<{ _id: MongoObjectId; length: number }>(`${GRIDFS_BUCKET}.files`)
    .findOne({ _id: new ObjectId(gridFsId) }, { projection: { length: 1 } });
  return file ? file.length : null;
}
