"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCurrentUser } from "@/shared/lib/auth";
import type { ActionResult } from "@/shared/types/action";
import { assertValidStoryDates } from "../domain/life-entry";
import { MongoLifeEntryRepository } from "../infrastructure/mongo-life-entry-repository";
import { lifeEntryInputSchema } from "./life-entry-schema";
import { deleteAttachmentById } from "@/shared/lib/mongodb/attachments";
import { mongoIdSchema } from "./attachment-upload-schema";

const repository = new MongoLifeEntryRepository();

function parseJsonField(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function toInput(formData: FormData) {
  return {
    startDate: formData.get("startDate"), endDate: formData.get("endDate"), datePrecision: formData.get("datePrecision"),
    title: formData.get("title"), narrative: formData.get("narrative"), lifeAreas: formData.getAll("lifeAreas"), lifeArea: formData.get("lifeAreas") ?? undefined,
    changeDirection: formData.get("changeDirection"), momentFlags: formData.getAll("momentFlags"), difficulty: formData.get("difficulty"), learning: formData.get("learning"),
    transformation: formData.get("transformation"), tags: formData.get("tags") ?? "", linkedEntryId: formData.get("linkedEntryId") ?? "",
    linkType: formData.get("linkType") ?? "related",
    textOrigins: parseJsonField(formData.get("textOrigins")),
    textContainsAi: parseJsonField(formData.get("textContainsAi")),
    aiClassified: formData.get("aiClassified") ?? "false",
  };
}

function localePath(locale: string, suffix = "") {
  return `/${locale === "en" ? "en" : "es"}/app${suffix}`;
}

function validationFailure(error: z.ZodError, locale?: string | null) {
  const flattened = error.flatten();
  const fieldErrors = flattened.fieldErrors as Record<string, string[]>;
  const firstMessage = Object.values(fieldErrors).flat().find(Boolean) ?? flattened.formErrors[0];
  const fallback = locale === "en" ? "Review the marked fields." : "Revisa los campos marcados.";
  return { ok: false as const, error: firstMessage ?? fallback, fieldErrors };
}

export async function createLifeEntryAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = lifeEntryInputSchema.safeParse(toInput(formData));
  if (!parsed.success) return validationFailure(parsed.error, formData.get("locale")?.toString());

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
  if (!parsed.success) return validationFailure(parsed.error, formData.get("locale")?.toString());
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
