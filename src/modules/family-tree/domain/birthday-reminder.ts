export const REMINDER_UNITS = ["days", "weeks", "months"] as const;
export type ReminderUnit = (typeof REMINDER_UNITS)[number];

export type BirthdayReminderOffset = {
  unit: ReminderUnit;
  amount: number;
  hour: number;
  minute: number;
};

export type BirthdayReminderPreset = {
  id: string;
  userId: string;
  name: string;
  offsets: BirthdayReminderOffset[];
  isDefault: boolean;
};

export type GoogleCalendarReminderEvent = {
  offsetKey: string;
  eventId: string;
};

export const DEFAULT_BIRTHDAY_OFFSETS: BirthdayReminderOffset[] = [
  { unit: "days", amount: 0, hour: 9, minute: 0 },
  { unit: "days", amount: 1, hour: 20, minute: 0 },
];

export function canRemindBirthday(birthDate: string | null | undefined) {
  return /^\d{4}-\d{2}-\d{2}$/.test(birthDate ?? "");
}

export function offsetKey(offset: BirthdayReminderOffset) {
  return `${offset.unit}:${offset.amount}:${offset.hour}:${offset.minute}`;
}

export function padTime(value: number) {
  return String(value).padStart(2, "0");
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function civilDate(year: number, month: number, day: number) {
  const safeMonth = Math.min(12, Math.max(1, month));
  const safeDay = Math.min(lastDayOfMonth(year, safeMonth), Math.max(1, day));
  return `${year}-${padTime(safeMonth)}-${padTime(safeDay)}`;
}

function shiftCivilDate(year: number, month: number, day: number, offset: BirthdayReminderOffset) {
  if (offset.unit === "months") {
    const totalMonths = (year * 12 + (month - 1)) - offset.amount;
    const nextYear = Math.floor(totalMonths / 12);
    const nextMonth = (totalMonths % 12) + 1;
    return civilDate(nextYear, nextMonth, day);
  }
  const days = offset.unit === "weeks" ? offset.amount * 7 : offset.amount;
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - days);
  return civilDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function reminderCivilDate(birthDate: string, offset: BirthdayReminderOffset, year: number) {
  const [, month, day] = birthDate.split("-").map(Number);
  return shiftCivilDate(year, month, day, offset);
}

export function reminderDateTime(birthDate: string, offset: BirthdayReminderOffset, year: number) {
  const date = reminderCivilDate(birthDate, offset, year);
  return `${date}T${padTime(offset.hour)}:${padTime(offset.minute)}:00`;
}

export function reminderEventTitle(personName: string, offset: BirthdayReminderOffset, locale: "es" | "en") {
  const name = personName.trim() || (locale === "es" ? "un familiar" : "a relative");
  if (offset.amount === 0) {
    return locale === "es" ? `Cumpleaños de ${name}` : `${name}’s birthday`;
  }
  const when = offsetLabel(offset, locale, { includeTime: false });
  return locale === "es" ? `${when}: cumpleaños de ${name}` : `${when}: ${name}’s birthday`;
}

export function offsetLabel(offset: BirthdayReminderOffset, locale: "es" | "en", options?: { includeTime?: boolean }) {
  const time = `${padTime(offset.hour)}:${padTime(offset.minute)}`;
  const withTime = options?.includeTime !== false;
  if (offset.amount === 0) {
    return locale === "es"
      ? withTime ? `El mismo día a las ${time}` : "El mismo día"
      : withTime ? `Same day at ${time}` : "Same day";
  }
  const unitLabel = unitWord(offset.unit, offset.amount, locale);
  const ahead = locale === "es" ? `${offset.amount} ${unitLabel} antes` : `${offset.amount} ${unitLabel} before`;
  return withTime ? (locale === "es" ? `${ahead} a las ${time}` : `${ahead} at ${time}`) : ahead;
}

function unitWord(unit: ReminderUnit, amount: number, locale: "es" | "en") {
  if (locale === "es") {
    if (unit === "days") return amount === 1 ? "día" : "días";
    if (unit === "weeks") return amount === 1 ? "semana" : "semanas";
    return amount === 1 ? "mes" : "meses";
  }
  if (unit === "days") return amount === 1 ? "day" : "days";
  if (unit === "weeks") return amount === 1 ? "week" : "weeks";
  return amount === 1 ? "month" : "months";
}

export function defaultPresetName(locale: "es" | "en") {
  return locale === "es" ? "Cumpleaños" : "Birthdays";
}

export function normalizeOffsets(offsets: BirthdayReminderOffset[]) {
  const unique = new Map<string, BirthdayReminderOffset>();
  for (const offset of offsets) {
    if (offset.amount < 0 || offset.hour < 0 || offset.hour > 23 || offset.minute < 0 || offset.minute > 59) continue;
    if (offset.amount === 0 && offset.unit !== "days") continue;
    unique.set(offsetKey(offset), {
      unit: offset.unit,
      amount: offset.amount,
      hour: offset.hour,
      minute: offset.minute,
    });
  }
  return [...unique.values()].slice(0, 8);
}
