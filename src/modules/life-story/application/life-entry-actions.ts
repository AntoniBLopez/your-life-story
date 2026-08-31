"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCurrentUser } from "@/shared/lib/auth";
import type { ActionResult } from "@/shared/types/action";
import { assertValidStoryDates } from "../domain/life-entry";
import { MongoLifeEntryRepository } from "../infrastructure/mongo-life-entry-repository";
import { lifeEntryInputSchema } from "./life-entry-schema";
import { storeAttachment, deleteAttachmentById } from "@/shared/lib/mongodb/attachments";
import { ObjectId } from "mongodb";
import {
  ATTACHMENT_CONTENT_TYPES,
  isAudioContentType,
  resolveAttachmentContentType,
  type AttachmentContentType,
} from "../domain/attachment-content-type";
import { VOICE_FIELD_KEYS } from "../domain/voice-note";

const repository = new MongoLifeEntryRepository();

const mongoIdSchema = z.string().refine((value) => ObjectId.isValid(value), "Invalid entry id.");

const attachmentSchema = z.object({
  entryId: mongoIdSchema,
  fileName: z.string().min(1).max(160),
  contentType: z.enum(ATTACHMENT_CONTENT_TYPES),
  size: z.number().int().positive().max(15 * 1024 * 1024),
  fieldKey: z.enum(VOICE_FIELD_KEYS).optional(),
  transcript: z.string().max(8000).optional(),
});

function toInput(formData: FormData) {
  return {
    startDate: formData.get("startDate"), endDate: formData.get("endDate"), datePrecision: formData.get("datePrecision"),
    title: formData.get("title"), narrative: formData.get("narrative"), lifeAreas: formData.getAll("lifeAreas"), lifeArea: formData.get("lifeAreas") ?? undefined,
    changeDirection: formData.get("changeDirection"), momentFlags: formData.getAll("momentFlags"), difficulty: formData.get("difficulty"), learning: formData.get("learning"),
    transformation: formData.get("transformation"), tags: formData.get("tags") ?? "", linkedEntryId: formData.get("linkedEntryId") ?? "",
    linkType: formData.get("linkType") ?? "related",
  };
}

function localePath(locale: string, suffix = "") {
  return `/${locale === "en" ? "en" : "es"}/app${suffix}`;
}

export async function createLifeEntryAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = lifeEntryInputSchema.safeParse(toInput(formData));
  if (!parsed.success) return { ok: false, error: "Revisa los campos marcados.", fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    assertValidStoryDates(parsed.data.startDate, parsed.data.endDate);
    const user = await requireCurrentUser();
    const entry = await repository.create(user.id, parsed.data);
    if (parsed.data.linkedEntryId) await repository.createLink(user.id, entry.id, parsed.data.linkedEntryId, parsed.data.linkType);
    revalidatePath(localePath(String(formData.get("locale"))));
    return { ok: true, data: { id: entry.id } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo guardar la experiencia." };
  }
}

export async function updateLifeEntryAction(entryId: string, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = lifeEntryInputSchema.safeParse(toInput(formData));
  if (!parsed.success) return { ok: false, error: "Revisa los campos marcados.", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    assertValidStoryDates(parsed.data.startDate, parsed.data.endDate);
    const user = await requireCurrentUser();
    const entry = await repository.update(user.id, entryId, parsed.data);
    await repository.replaceLink(user.id, entryId, parsed.data.linkedEntryId, parsed.data.linkType);
    revalidatePath(localePath(String(formData.get("locale"))));
    return { ok: true, data: { id: entry.id } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo actualizar la experiencia." };
  }
}

export async function deleteLifeEntryAction(entryId: string, locale: string): Promise<ActionResult> {
  try {
    const user = await requireCurrentUser();
    await repository.delete(user.id, entryId);
    revalidatePath(localePath(locale));
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo borrar la experiencia." };
  }
}

export async function uploadAttachmentAction(request: z.input<typeof attachmentSchema> & { fileBase64: string }): Promise<ActionResult<{ id: string }>> {
  const contentType = resolveAttachmentContentType(request.fileName, request.contentType);
  if (!contentType) {
    return { ok: false, error: "El archivo no cumple los requisitos: imágenes, PDF o audio, hasta 15 MB." };
  }

  const parsed = attachmentSchema.extend({ fileBase64: z.string().min(1) }).safeParse({
    ...request,
    contentType,
  });
  const isAudio = parsed.success && isAudioContentType(parsed.data.contentType);
  if (!parsed.success) {
    return { ok: false, error: "El archivo no cumple los requisitos: imágenes, PDF o audio, hasta 15 MB." };
  }
  try {
    const user = await requireCurrentUser();
    const entry = await repository.findById(user.id, parsed.data.entryId);
    if (!entry) return { ok: false, error: "No tienes acceso a esta experiencia." };
    const buffer = Buffer.from(parsed.data.fileBase64, "base64");
    if (buffer.byteLength !== parsed.data.size) return { ok: false, error: "El archivo no coincide con el tamaño indicado." };
    const attachment = await storeAttachment({
      userId: user.id,
      entryId: parsed.data.entryId,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.contentType,
      sizeBytes: parsed.data.size,
      buffer,
      fieldKey: parsed.data.fieldKey ?? null,
      transcript: isAudio ? parsed.data.transcript ?? null : null,
    });
    return { ok: true, data: { id: attachment.id } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo guardar el adjunto." };
  }
}

export async function deleteAttachmentAction(
  attachmentId: string,
  entryId: string,
  locale: string,
): Promise<ActionResult> {
  const parsedEntryId = mongoIdSchema.safeParse(entryId);
  const parsedAttachmentId = mongoIdSchema.safeParse(attachmentId);
  if (!parsedEntryId.success || !parsedAttachmentId.success) {
    return { ok: false, error: "Adjunto no válido." };
  }

  try {
    const user = await requireCurrentUser();
    const entry = await repository.findById(user.id, parsedEntryId.data);
    if (!entry) return { ok: false, error: "No tienes acceso a esta experiencia." };

    const deleted = await deleteAttachmentById(user.id, parsedAttachmentId.data);
    if (!deleted || deleted.entryId !== parsedEntryId.data) {
      return { ok: false, error: "No se encontró el adjunto." };
    }

    revalidatePath(`/${locale === "en" ? "en" : "es"}/app/entries/${parsedEntryId.data}/edit`);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo eliminar el adjunto." };
  }
}
