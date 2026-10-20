import { Binary, GridFSBucket, ObjectId, type ObjectId as MongoObjectId } from "mongodb";
import {
  ATTACHMENT_GRIDFS_CHUNK_BYTES,
  ATTACHMENT_UPLOAD_TTL_MS,
  countGridFsChunks,
  countUploadParts,
  expectedPartBytes,
  splitPartIntoGridFsChunks,
} from "@/modules/life-story/domain/attachment-upload";
import { getDb } from "@/shared/lib/mongodb/client";
import { COLLECTIONS, GRIDFS_BUCKET } from "@/shared/lib/mongodb/collections";
import { recordStoredAttachment, safeStorageName, type AttachmentRecord } from "@/shared/lib/mongodb/attachments";

type UploadDbRecord = {
  _id: MongoObjectId;
  userId: string;
  entryId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  totalParts: number;
  receivedParts: number[];
  fieldKey: string | null;
  transcript: string | null;
  createdAt: Date;
};

export type AttachmentUploadSession = {
  id: string;
  userId: string;
  entryId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  totalParts: number;
  receivedParts: number[];
};

function mapUpload(record: UploadDbRecord): AttachmentUploadSession {
  return {
    id: record._id.toString(),
    userId: record.userId,
    entryId: record.entryId,
    fileName: record.fileName,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
    totalParts: record.totalParts,
    receivedParts: record.receivedParts,
  };
}

function chunksCollection(db: Awaited<ReturnType<typeof getDb>>) {
  return db.collection(`${GRIDFS_BUCKET}.chunks`);
}

function uploadsCollection(db: Awaited<ReturnType<typeof getDb>>) {
  return db.collection<UploadDbRecord>(COLLECTIONS.entryAttachmentUploads);
}

async function discardUploads(db: Awaited<ReturnType<typeof getDb>>, ids: MongoObjectId[]) {
  if (ids.length === 0) return;
  await chunksCollection(db).deleteMany({ files_id: { $in: ids } });
  await uploadsCollection(db).deleteMany({ _id: { $in: ids } });
}

/** Removes unfinished uploads of a user that were abandoned (closed tab, network loss…). */
export async function discardStaleAttachmentUploads(userId: string, now = new Date()) {
  const db = await getDb();
  const stale = await uploadsCollection(db)
    .find({ userId, createdAt: { $lt: new Date(now.getTime() - ATTACHMENT_UPLOAD_TTL_MS) } }, { projection: { _id: 1 } })
    .toArray();
  await discardUploads(db, stale.map((row) => row._id));
}

export async function beginAttachmentUpload(input: {
  userId: string;
  entryId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  fieldKey?: string | null;
  transcript?: string | null;
}) {
  const db = await getDb();
  await discardStaleAttachmentUploads(input.userId);

  const record: UploadDbRecord = {
    _id: new ObjectId(),
    userId: input.userId,
    entryId: input.entryId,
    storagePath: `${input.userId}/${input.entryId}/${crypto.randomUUID()}-${safeStorageName(input.fileName)}`,
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    totalParts: countUploadParts(input.sizeBytes),
    receivedParts: [],
    fieldKey: input.fieldKey ?? null,
    transcript: input.transcript ?? null,
    createdAt: new Date(),
  };
  await uploadsCollection(db).insertOne(record);
  return mapUpload(record);
}

export async function getAttachmentUpload(userId: string, uploadId: string) {
  if (!ObjectId.isValid(uploadId)) return null;
  const db = await getDb();
  const record = await uploadsCollection(db).findOne({ _id: new ObjectId(uploadId), userId });
  return record ? mapUpload(record) : null;
}

export type WritePartResult = { ok: true } | { ok: false; reason: "not_found" | "bad_index" | "bad_size" };

/** Stores one part directly as GridFS chunks. Re-sending the same part is idempotent. */
export async function writeAttachmentUploadPart(userId: string, uploadId: string, partIndex: number, part: Uint8Array): Promise<WritePartResult> {
  const upload = await getAttachmentUpload(userId, uploadId);
  if (!upload) return { ok: false, reason: "not_found" };
  const expected = expectedPartBytes(upload.sizeBytes, partIndex);
  if (expected === null) return { ok: false, reason: "bad_index" };
  if (part.byteLength !== expected) return { ok: false, reason: "bad_size" };

  const db = await getDb();
  const filesId = new ObjectId(upload.id);
  const chunks = splitPartIntoGridFsChunks(partIndex, part);
  await chunksCollection(db).bulkWrite(
    chunks.map((chunk) => ({
      replaceOne: {
        filter: { files_id: filesId, n: chunk.n },
        replacement: { files_id: filesId, n: chunk.n, data: new Binary(chunk.data) },
        upsert: true,
      },
    })),
    { ordered: false },
  );
  await uploadsCollection(db).updateOne({ _id: filesId, userId }, { $addToSet: { receivedParts: partIndex } });
  return { ok: true };
}

export type CompleteUploadResult =
  | { ok: true; attachment: AttachmentRecord }
  | { ok: false; reason: "not_found" | "incomplete" };

/** Publishes the GridFS file and the attachment record once every part has arrived. */
export async function completeAttachmentUpload(userId: string, uploadId: string): Promise<CompleteUploadResult> {
  if (!ObjectId.isValid(uploadId)) return { ok: false, reason: "not_found" };
  const db = await getDb();
  const filesId = new ObjectId(uploadId);
  const upload = await uploadsCollection(db).findOne({ _id: filesId, userId });
  if (!upload) return { ok: false, reason: "not_found" };

  const allParts = upload.receivedParts.length === upload.totalParts;
  const chunkCount = await chunksCollection(db).countDocuments({ files_id: filesId });
  if (!allParts || chunkCount !== countGridFsChunks(upload.sizeBytes)) return { ok: false, reason: "incomplete" };

  await db.collection(`${GRIDFS_BUCKET}.files`).insertOne({
    _id: filesId,
    length: upload.sizeBytes,
    chunkSize: ATTACHMENT_GRIDFS_CHUNK_BYTES,
    uploadDate: new Date(),
    filename: upload.storagePath,
    metadata: { userId: upload.userId, entryId: upload.entryId, contentType: upload.mimeType },
  });

  try {
    const attachment = await recordStoredAttachment({
      userId: upload.userId,
      entryId: upload.entryId,
      storagePath: upload.storagePath,
      gridFsId: filesId.toString(),
      fileName: upload.fileName,
      mimeType: upload.mimeType,
      sizeBytes: upload.sizeBytes,
      fieldKey: upload.fieldKey,
      transcript: upload.transcript,
    });
    await uploadsCollection(db).deleteOne({ _id: filesId, userId });
    return { ok: true, attachment };
  } catch (error) {
    await new GridFSBucket(db, { bucketName: GRIDFS_BUCKET }).delete(filesId).catch(() => undefined);
    await uploadsCollection(db).deleteOne({ _id: filesId, userId });
    throw error;
  }
}

export async function abortAttachmentUpload(userId: string, uploadId: string) {
  if (!ObjectId.isValid(uploadId)) return false;
  const db = await getDb();
  const filesId = new ObjectId(uploadId);
  const upload = await uploadsCollection(db).findOne({ _id: filesId, userId }, { projection: { _id: 1 } });
  if (!upload) return false;
  await discardUploads(db, [filesId]);
  return true;
}
