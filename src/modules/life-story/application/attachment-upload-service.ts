import { isAudioContentType, resolveAttachmentContentType } from "../domain/attachment-content-type";
import { ATTACHMENT_UPLOAD_PART_BYTES, MAX_ATTACHMENT_BYTES } from "../domain/attachment-upload";
import { MongoLifeEntryRepository } from "../infrastructure/mongo-life-entry-repository";
import { beginAttachmentUploadSchema, mongoIdSchema } from "./attachment-upload-schema";
import type { AttachmentUploadErrorCode } from "./attachment-upload-errors";
import {
  abortAttachmentUpload,
  beginAttachmentUpload,
  completeAttachmentUpload,
  writeAttachmentUploadPart,
} from "@/shared/lib/mongodb/attachment-uploads";

const repository = new MongoLifeEntryRepository();

export type UploadServiceResult<T> = { ok: true; data: T } | { ok: false; code: AttachmentUploadErrorCode; status: number };

function fail(code: AttachmentUploadErrorCode, status: number): { ok: false; code: AttachmentUploadErrorCode; status: number } {
  return { ok: false, code, status };
}

export async function startAttachmentUpload(userId: string, body: unknown): Promise<UploadServiceResult<{ uploadId: string; partSize: number; totalParts: number }>> {
  const raw = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const fileName = typeof raw.fileName === "string" ? raw.fileName : "";
  const contentType = resolveAttachmentContentType(fileName, typeof raw.contentType === "string" ? raw.contentType : "");
  if (typeof raw.size === "number" && raw.size > MAX_ATTACHMENT_BYTES) return fail("too_large", 413);
  if (!contentType) return fail("invalid_file", 400);

  const parsed = beginAttachmentUploadSchema.safeParse({ ...raw, contentType });
  if (!parsed.success) return fail("invalid_file", 400);

  const entry = await repository.findById(userId, parsed.data.entryId);
  if (!entry) return fail("entry_not_found", 404);

  const upload = await beginAttachmentUpload({
    userId,
    entryId: parsed.data.entryId,
    fileName: parsed.data.fileName,
    mimeType: parsed.data.contentType,
    sizeBytes: parsed.data.size,
    fieldKey: parsed.data.fieldKey ?? null,
    transcript: isAudioContentType(parsed.data.contentType) ? parsed.data.transcript ?? null : null,
  });
  return { ok: true, data: { uploadId: upload.id, partSize: ATTACHMENT_UPLOAD_PART_BYTES, totalParts: upload.totalParts } };
}

export async function receiveAttachmentUploadPart(userId: string, uploadId: string, partIndexParam: string, part: Uint8Array): Promise<UploadServiceResult<{ received: number }>> {
  if (!mongoIdSchema.safeParse(uploadId).success) return fail("upload_not_found", 404);
  if (!/^\d+$/.test(partIndexParam)) return fail("bad_part", 400);
  const result = await writeAttachmentUploadPart(userId, uploadId, Number(partIndexParam), part);
  if (!result.ok) return result.reason === "not_found" ? fail("upload_not_found", 404) : fail("bad_part", 400);
  return { ok: true, data: { received: part.byteLength } };
}

export async function finishAttachmentUpload(userId: string, uploadId: string): Promise<UploadServiceResult<{ id: string }>> {
  if (!mongoIdSchema.safeParse(uploadId).success) return fail("upload_not_found", 404);
  const result = await completeAttachmentUpload(userId, uploadId);
  if (!result.ok) return result.reason === "not_found" ? fail("upload_not_found", 404) : fail("incomplete", 409);
  return { ok: true, data: { id: result.attachment.id } };
}

export async function cancelAttachmentUpload(userId: string, uploadId: string): Promise<UploadServiceResult<null>> {
  if (!mongoIdSchema.safeParse(uploadId).success) return fail("upload_not_found", 404);
  const removed = await abortAttachmentUpload(userId, uploadId);
  return removed ? { ok: true, data: null } : fail("upload_not_found", 404);
}
