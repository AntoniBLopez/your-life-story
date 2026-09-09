import type { FamilyPerson } from "../domain/family-graph";
import {
  canRemindBirthday,
  offsetKey,
  reminderDateTime,
  reminderEventTitle,
  type BirthdayReminderOffset,
  type GoogleCalendarReminderEvent,
} from "../domain/birthday-reminder";
import { MongoBirthdayReminderPresetRepository } from "../infrastructure/mongo-birthday-reminder-preset-repository";
import { MongoFamilyRepository } from "../infrastructure/mongo-family-repository";
import { deleteCalendarEvent, getGoogleCalendarStatus, upsertCalendarEvent } from "../infrastructure/google-calendar";

const people = new MongoFamilyRepository();
const presets = new MongoBirthdayReminderPresetRepository();

function occurrenceYear(timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric" }).formatToParts(new Date());
    return Number(parts.find((part) => part.type === "year")?.value ?? new Date().getFullYear());
  } catch {
    return new Date().getFullYear();
  }
}

export async function listBirthdayReminderPresets(userId: string) {
  return presets.listByUser(userId);
}

export async function googleCalendarConnection(userId: string) {
  return getGoogleCalendarStatus(userId);
}

export async function syncPersonBirthdayReminders(input: {
  userId: string;
  person: FamilyPerson;
  locale: "es" | "en";
  timeZone: string;
  offsets?: BirthdayReminderOffset[];
}) {
  const enabled = Boolean(input.person.birthdayReminderEnabled && canRemindBirthday(input.person.birthDate));
  const existing = input.person.googleCalendarEventIds ?? [];
  if (!enabled || !input.person.birthDate) {
    await Promise.all(existing.map((item) => deleteCalendarEvent(input.userId, item.eventId)));
    await people.updatePersonReminderEvents(input.userId, input.person.id, []);
    return [];
  }

  const calendar = await getGoogleCalendarStatus(input.userId);
  if (!calendar.connected) {
    return existing;
  }

  const preset = input.person.birthdayReminderPresetId
    ? await presets.findById(input.userId, input.person.birthdayReminderPresetId)
    : null;
  const offsets = input.offsets ?? preset?.offsets ?? [];
  const year = occurrenceYear(input.timeZone);
  const keep = new Set(offsets.map(offsetKey));
  const byKey = new Map(existing.map((item) => [item.offsetKey, item.eventId]));

  await Promise.all(
    existing.filter((item) => !keep.has(item.offsetKey)).map((item) => deleteCalendarEvent(input.userId, item.eventId)),
  );

  const next: GoogleCalendarReminderEvent[] = [];
  for (const offset of offsets) {
    const key = offsetKey(offset);
    const eventId = await upsertCalendarEvent(input.userId, byKey.get(key), {
      summary: reminderEventTitle(input.person.fullName, offset, input.locale),
      description: input.locale === "es"
        ? "Recordatorio de cumpleaños creado desde el árbol familiar de Your Life Story."
        : "Birthday reminder created from the Your Life Story family tree.",
      startDateTime: reminderDateTime(input.person.birthDate, offset, year),
      timeZone: input.timeZone,
      personId: input.person.id,
      offsetKey: key,
    });
    if (eventId) next.push({ offsetKey: key, eventId });
  }

  await people.updatePersonReminderEvents(input.userId, input.person.id, next);
  return next;
}

export async function syncPeopleUsingPreset(userId: string, presetId: string, locale: "es" | "en", timeZone: string) {
  const [preset, related] = await Promise.all([
    presets.findById(userId, presetId),
    people.listPeopleByReminderPreset(userId, presetId),
  ]);
  if (!preset) return;
  for (const person of related.filter((item: FamilyPerson) => item.birthdayReminderEnabled)) {
    await syncPersonBirthdayReminders({ userId, person, locale, timeZone, offsets: preset.offsets });
  }
}

export async function syncAllBirthdayRemindersForUser(userId: string, locale: "es" | "en", timeZone: string) {
  const related = await people.listPeopleWithBirthdayReminders(userId);
  for (const person of related) {
    await syncPersonBirthdayReminders({ userId, person, locale, timeZone });
  }
}

export async function unsyncPersonBirthdayReminders(userId: string, person: FamilyPerson) {
  await Promise.all((person.googleCalendarEventIds ?? []).map((item) => deleteCalendarEvent(userId, item.eventId)));
  if (person.id) await people.updatePersonReminderEvents(userId, person.id, []);
}

export async function unsyncAllBirthdayRemindersForUser(userId: string) {
  const related = await people.listPeopleWithBirthdayReminders(userId);
  for (const person of related) {
    await unsyncPersonBirthdayReminders(userId, person);
  }
}
