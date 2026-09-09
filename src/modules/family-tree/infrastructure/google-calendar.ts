import { env } from "@/shared/lib/env";
import { refreshGoogleAccessToken } from "@/modules/identity/infrastructure/google-oauth";
import { MongoGoogleCalendarAccountRepository } from "./mongo-google-calendar-account-repository";

const accounts = new MongoGoogleCalendarAccountRepository();
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export type CalendarEventPayload = {
  summary: string;
  description: string;
  startDateTime: string;
  timeZone: string;
  personId: string;
  offsetKey: string;
};

type GoogleEvent = { id?: string };

async function calendarAccessToken(userId: string) {
  const account = await accounts.findByUser(userId);
  if (!account) return null;
  const stillValid = account.accessToken && account.accessTokenExpiresAt && account.accessTokenExpiresAt.getTime() > Date.now() + 30_000;
  if (stillValid) return { account, accessToken: account.accessToken as string };
  const refreshed = await refreshGoogleAccessToken(account.refreshToken);
  const expiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);
  await accounts.updateAccessToken(userId, refreshed.accessToken, expiresAt);
  return { account, accessToken: refreshed.accessToken };
}

async function calendarFetch(accessToken: string, path: string, init?: RequestInit) {
  const response = await fetch(`${CALENDAR_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error?.message === "string" ? data.error.message : "Google Calendar request failed.";
    throw new Error(message);
  }
  return data;
}

function addMinutes(startDateTime: string, minutes: number) {
  const [date, time] = startDateTime.split("T");
  const [hour, minute] = (time ?? "00:00:00").split(":").map(Number);
  const total = hour * 60 + minute + minutes;
  const nextDay = Math.floor(total / (24 * 60));
  const clock = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const nextDate = new Date(`${date}T00:00:00Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + nextDay);
  const y = nextDate.getUTCFullYear();
  const m = String(nextDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(nextDate.getUTCDate()).padStart(2, "0");
  const hh = String(Math.floor(clock / 60)).padStart(2, "0");
  const mm = String(clock % 60).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}:00`;
}

function eventBody(payload: CalendarEventPayload) {
  return {
    summary: payload.summary,
    description: payload.description,
    start: { dateTime: payload.startDateTime, timeZone: payload.timeZone },
    end: { dateTime: addMinutes(payload.startDateTime, 30), timeZone: payload.timeZone },
    recurrence: ["RRULE:FREQ=YEARLY"],
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 0 }] },
    extendedProperties: { private: { yls: "birthday-reminder", personId: payload.personId, offsetKey: payload.offsetKey } },
  };
}

export async function getGoogleCalendarStatus(userId: string) {
  const account = await accounts.findByUser(userId);
  return account ? { connected: true as const, email: account.googleEmail } : { connected: false as const, email: null };
}

export async function upsertCalendarEvent(userId: string, eventId: string | undefined, payload: CalendarEventPayload) {
  const auth = await calendarAccessToken(userId);
  if (!auth) return null;
  const calendarId = encodeURIComponent(auth.account.calendarId);
  const body = JSON.stringify(eventBody(payload));
  if (eventId) {
    try {
      const updated = await calendarFetch(auth.accessToken, `/calendars/${calendarId}/events/${encodeURIComponent(eventId)}`, { method: "PATCH", body }) as GoogleEvent;
      if (updated?.id) return updated.id;
    } catch {
      // Recreate when the stored event no longer exists.
    }
  }
  const created = await calendarFetch(auth.accessToken, `/calendars/${calendarId}/events`, { method: "POST", body }) as GoogleEvent;
  return created?.id ?? null;
}

export async function deleteCalendarEvent(userId: string, eventId: string) {
  const auth = await calendarAccessToken(userId);
  if (!auth) return;
  const calendarId = encodeURIComponent(auth.account.calendarId);
  try {
    await calendarFetch(auth.accessToken, `/calendars/${calendarId}/events/${encodeURIComponent(eventId)}`, { method: "DELETE" });
  } catch {
    // Already removed from Google Calendar.
  }
}

export function googleCalendarConfigured() {
  return Boolean(env.googleClientId && env.googleClientSecret);
}
