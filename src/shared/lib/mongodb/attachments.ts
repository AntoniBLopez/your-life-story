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

function getBucket() {
  return new GridFSBucket(getDb() as unknown as import("mongodb").Db, { bucketName: GRIDFS_BUCKET });
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
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
  const storagePath = `${input.userId}/${input.entryId}/${crypto.randomUUID()}-${safeName}`;

  const gridFsId = await new Promise<string>((resolve, reject) => {
    const stream = bucket.openUploadStream(storagePath, {
      metadata: { userId: input.userId, entryId: input.entryId, contentType: input.mimeType },
    });
    stream.on("error", reject);
    stream.on("finish", () => resolve(stream.id.toString()));
    stream.end(input.buffer);
  });

  const record = {
    userId: input.userId,
    entryId: input.entryId,
    storagePath,
    gridFsId: gridFsId.toString(),
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

export async function openAttachmentStream(gridFsId: string) {
  const db = await getDb();
  const bucket = new GridFSBucket(db, { bucketName: GRIDFS_BUCKET });
  return bucket.openDownloadStream(new ObjectId(gridFsId));
}
