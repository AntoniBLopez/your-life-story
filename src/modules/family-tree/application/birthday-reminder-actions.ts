"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/shared/lib/auth";
import type { ActionResult } from "@/shared/types/action";
import { DEFAULT_BIRTHDAY_OFFSETS, defaultPresetName, normalizeOffsets } from "../domain/birthday-reminder";
import { MongoBirthdayReminderPresetRepository } from "../infrastructure/mongo-birthday-reminder-preset-repository";
import { MongoGoogleCalendarAccountRepository } from "../infrastructure/mongo-google-calendar-account-repository";
import { revokeGoogleToken } from "@/modules/identity/infrastructure/google-oauth";
import { birthdayReminderOffsetsSchema, birthdayReminderPresetInputSchema } from "./birthday-reminder-schemas";
import { syncAllBirthdayRemindersForUser, syncPeopleUsingPreset, unsyncAllBirthdayRemindersForUser } from "./birthday-reminder-service";

const presets = new MongoBirthdayReminderPresetRepository();
const calendars = new MongoGoogleCalendarAccountRepository();

function localeFrom(value: unknown): "es" | "en" {
  return String(value) === "en" ? "en" : "es";
}

export async function saveBirthdayReminderPresetAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const locale = localeFrom(formData.get("locale"));
  let offsets: unknown = [];
  try {
    offsets = JSON.parse(String(formData.get("offsets") ?? "[]"));
  } catch {
    return { ok: false, error: locale === "es" ? "Revisa los avisos del conjunto." : "Check the reminder set." };
  }
  const parsed = birthdayReminderPresetInputSchema.safeParse({
    id: String(formData.get("presetId") ?? ""),
    name: String(formData.get("name") ?? ""),
    offsets: normalizeOffsets(birthdayReminderOffsetsSchema.catch([]).parse(offsets)),
    isDefault: formData.get("isDefault") === "on",
  });
  if (!parsed.success) {
    return { ok: false, error: locale === "es" ? "Pon un nombre y al menos un aviso." : "Add a name and at least one reminder." };
  }
  try {
    const user = await requireCurrentUser();
    const timeZone = String(formData.get("timeZone") || "UTC");
    const { preset, created, previousOffsets } = await presets.upsert(user.id, {
      id: parsed.data.id || null,
      name: parsed.data.name,
      offsets: parsed.data.offsets,
      isDefault: parsed.data.isDefault,
    });
    const changed = JSON.stringify(previousOffsets) !== JSON.stringify(parsed.data.offsets);
    if (!created && changed) {
      await syncPeopleUsingPreset(user.id, preset.id, locale, timeZone);
    }
    revalidatePath(`/${locale}/app/family`);
    revalidatePath(`/${locale}/app/settings`);
    return { ok: true, data: { id: preset.id } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : locale === "es" ? "No se pudo guardar el conjunto." : "The reminder set could not be saved." };
  }
}

export async function deleteBirthdayReminderPresetAction(presetId: string, locale: "es" | "en"): Promise<ActionResult> {
  try {
    const user = await requireCurrentUser();
    const result = await presets.deleteIfUnused(user.id, presetId);
    if (!result.deleted) {
      return { ok: false, error: locale === "es" ? "Este conjunto se está usando en otras personas." : "This set is still used by other people." };
    }
    revalidatePath(`/${locale}/app/family`);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : locale === "es" ? "No se pudo eliminar el conjunto." : "The reminder set could not be deleted." };
  }
}

export async function disconnectGoogleCalendarAction(locale: "es" | "en"): Promise<ActionResult> {
  try {
    const user = await requireCurrentUser();
    const account = await calendars.findByUser(user.id);
    if (account) await revokeGoogleToken(account.refreshToken);
    await calendars.deleteByUser(user.id);
    revalidatePath(`/${locale}/app/family`);
    revalidatePath(`/${locale}/app/settings`);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : locale === "es" ? "No se pudo desconectar Google Calendar." : "Google Calendar could not be disconnected." };
  }
}

export async function ensureDefaultBirthdayPreset(userId: string, locale: "es" | "en") {
  const existing = await presets.listByUser(userId);
  if (existing.length > 0) return existing;
  const { preset } = await presets.upsert(userId, {
    name: defaultPresetName(locale),
    offsets: DEFAULT_BIRTHDAY_OFFSETS,
    isDefault: true,
  });
  return [preset];
}

export async function resyncBirthdayRemindersAction(locale: "es" | "en", timeZone: string): Promise<ActionResult> {
  try {
    const user = await requireCurrentUser();
    await syncAllBirthdayRemindersForUser(user.id, locale, timeZone);
    revalidatePath(`/${locale}/app/family`);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : locale === "es" ? "No se pudieron sincronizar los avisos." : "The reminders could not be synced." };
  }
}

export { unsyncAllBirthdayRemindersForUser };
