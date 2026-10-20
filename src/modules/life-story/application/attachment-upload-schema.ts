import { ObjectId } from "mongodb";
import { z } from "zod";
import { ATTACHMENT_CONTENT_TYPES } from "../domain/attachment-content-type";
import { MAX_ATTACHMENT_BYTES } from "../domain/attachment-upload";
import { VOICE_FIELD_KEYS } from "../domain/voice-note";

export const mongoIdSchema = z.string().refine((value) => ObjectId.isValid(value), "Invalid id.");

export const beginAttachmentUploadSchema = z.object({
  entryId: mongoIdSchema,
  fileName: z.string().trim().min(1).max(160),
  contentType: z.enum(ATTACHMENT_CONTENT_TYPES),
  size: z.number().int().positive().max(MAX_ATTACHMENT_BYTES),
  fieldKey: z.enum(VOICE_FIELD_KEYS).optional(),
  transcript: z.string().max(8000).optional(),
});

export type BeginAttachmentUploadInput = z.input<typeof beginAttachmentUploadSchema>;
