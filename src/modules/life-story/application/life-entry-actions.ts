"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCurrentUser } from "@/shared/lib/auth";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import type { ActionResult } from "@/shared/types/action";
import { assertValidStoryDates } from "../domain/life-entry";
import { SupabaseLifeEntryRepository } from "../infrastructure/supabase-life-entry-repository";
import { lifeEntryInputSchema } from "./life-entry-schema";

const attachmentSchema = z.object({
  entryId: z.string().uuid(),
  fileName: z.string().min(1).max(160),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
  size: z.number().int().positive().max(10 * 1024 * 1024),
});

function toInput(formData: FormData) {
  return {
    startDate: formData.get("startDate"), endDate: formData.get("endDate"), datePrecision: formData.get("datePrecision"),
    title: formData.get("title"), narrative: formData.get("narrative"), lifeAreas: formData.getAll("lifeAreas"), lifeArea: formData.get("lifeAreas") ?? undefined,
    changeDirection: formData.get("changeDirection"), difficulty: formData.get("difficulty"), learning: formData.get("learning"),
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
    const supabase = await createSupabaseServerClient();
    const repository = new SupabaseLifeEntryRepository(supabase);
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
    const supabase = await createSupabaseServerClient();
    const repository = new SupabaseLifeEntryRepository(supabase);
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
    const supabase = await createSupabaseServerClient();
    const { data: attachments, error: attachmentError } = await supabase.from("entry_attachments").select("storage_path").eq("entry_id", entryId).eq("user_id", user.id);
    if (attachmentError) throw attachmentError;
    if (attachments?.length) await supabase.storage.from("life-attachments").remove(attachments.map((item: any) => item.storage_path));
    await new SupabaseLifeEntryRepository(supabase).delete(user.id, entryId);
    revalidatePath(localePath(locale));
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo borrar la experiencia." };
  }
}

export async function createAttachmentUploadAction(request: z.input<typeof attachmentSchema>): Promise<ActionResult<{ signedUrl: string; path: string }>> {
  const parsed = attachmentSchema.safeParse(request);
  if (!parsed.success) return { ok: false, error: "El archivo no cumple los requisitos: JPG, PNG, WEBP o PDF, hasta 10 MB." };
  try {
    const user = await requireCurrentUser();
    const supabase = await createSupabaseServerClient();
    const entry = await new SupabaseLifeEntryRepository(supabase).findById(user.id, parsed.data.entryId);
    if (!entry) return { ok: false, error: "No tienes acceso a esta experiencia." };
    const safeName = parsed.data.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
    const path = `${user.id}/${entry.id}/${crypto.randomUUID()}-${safeName}`;
    const { data, error } = await supabase.storage.from("life-attachments").createSignedUploadUrl(path);
    if (error || !data) throw error ?? new Error("No se pudo preparar la carga.");
    return { ok: true, data: { signedUrl: data.signedUrl, path } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo preparar el adjunto." };
  }
}

export async function registerAttachmentAction(request: z.input<typeof attachmentSchema> & { path: string }): Promise<ActionResult> {
  const parsed = attachmentSchema.extend({ path: z.string().min(1) }).safeParse(request);
  if (!parsed.success) return { ok: false, error: "Datos de adjunto no válidos." };
  try {
    const user = await requireCurrentUser();
    if (!parsed.data.path.startsWith(`${user.id}/${parsed.data.entryId}/`)) return { ok: false, error: "Ruta de adjunto no válida." };
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("entry_attachments").insert({
      user_id: user.id, entry_id: parsed.data.entryId, storage_path: parsed.data.path,
      file_name: parsed.data.fileName, mime_type: parsed.data.contentType, size_bytes: parsed.data.size,
    });
    if (error) throw error;
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo vincular el adjunto." };
  }
}
