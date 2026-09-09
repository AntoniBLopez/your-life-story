"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/shared/lib/auth";
import type { ActionResult } from "@/shared/types/action";
import { canRemindBirthday, DEFAULT_BIRTHDAY_OFFSETS, defaultPresetName, normalizeOffsets, type BirthdayReminderOffset } from "../domain/birthday-reminder";
import { MongoBirthdayReminderPresetRepository } from "../infrastructure/mongo-birthday-reminder-preset-repository";
import { MongoGoogleCalendarAccountRepository } from "../infrastructure/mongo-google-calendar-account-repository";
import { revokeGoogleToken } from "@/modules/identity/infrastructure/google-oauth";
import { birthdayReminderOffsetsSchema, birthdayReminderPresetInputSchema } from "./birthday-reminder-schemas";
import { syncAllBirthdayRemindersForUser, syncPeopleUsingPreset, syncPersonBirthdayReminders, unsyncAllBirthdayRemindersForUser, unsyncPersonBirthdayReminders } from "./birthday-reminder-service";
import { MongoFamilyRepository } from "../infrastructure/mongo-family-repository";

const people = new MongoFamilyRepository();
const presets = new MongoBirthdayReminderPresetRepository();
const calendars = new MongoGoogleCalendarAccountRepository();

function defaultPreset(presetList: Awaited<ReturnType<typeof presets.listByUser>>) {
  return presetList.find((item) => item.isDefault) ?? presetList[0] ?? null;
}

function localeFrom(value: unknown): "es" | "en" {
  return String(value) === "en" ? "en" : "es";
}

export async function quickBirthdayReminderAction(input: {
  personId: string;
  locale: "es" | "en";
  timeZone: string;
  offsets?: BirthdayReminderOffset[];
}): Promise<ActionResult<{ enabled: boolean; needsSetup?: boolean; needsCalendar?: boolean }>> {
  const locale = input.locale;
  try {
    const user = await requireCurrentUser();
    const person = await people.findPersonById(user.id, input.personId);
    if (!person) return { ok: false, error: locale === "es" ? "No se encontró a esta persona." : "This person was not found." };
    if (!canRemindBirthday(person.birthDate)) {
      return { ok: false, error: locale === "es" ? "Añade primero la fecha de nacimiento." : "Add a date of birth first." };
    }

    if (person.birthdayReminderEnabled) {
      await unsyncPersonBirthdayReminders(user.id, person);
      await people.updatePersonBirthdayReminder(user.id, person.id, { birthdayReminderEnabled: false, birthdayReminderPresetId: null });
      revalidatePath(`/${locale}/app/family`);
      return { ok: true, data: { enabled: false } };
    }

    const presetList = await presets.listByUser(user.id);
    let preset = defaultPreset(presetList);
    if (!preset) {
      if (!input.offsets?.length) {
        const calendar = await calendars.findByUser(user.id);
        return { ok: true, data: { enabled: false, needsSetup: true, needsCalendar: !calendar } };
      }
      const saved = await presets.upsert(user.id, {
        name: defaultPresetName(locale),
        offsets: normalizeOffsets(birthdayReminderOffsetsSchema.parse(input.offsets)),
        isDefault: true,
      });
      preset = saved.preset;
    }

    const calendar = await calendars.findByUser(user.id);
    if (!calendar) {
      return { ok: true, data: { enabled: false, needsCalendar: true } };
    }

    const updated = await people.updatePersonBirthdayReminder(user.id, person.id, {
      birthdayReminderEnabled: true,
      birthdayReminderPresetId: preset.id,
    });
    try {
      await syncPersonBirthdayReminders({
        userId: user.id,
        person: updated,
        locale,
        timeZone: input.timeZone,
        offsets: preset.offsets,
      });
    } catch (error) {
      console.error("Birthday reminder calendar sync failed:", error);
    }
    revalidatePath(`/${locale}/app/family`);
    return { ok: true, data: { enabled: true } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : locale === "es" ? "No se pudo activar el recordatorio." : "The reminder could not be enabled." };
  }
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
