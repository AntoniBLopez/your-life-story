"use client";

import { useEffect, useMemo, useState } from "react";
import { Cake, CalendarPlus, ChevronDown } from "lucide-react";
import {
  DEFAULT_BIRTHDAY_OFFSETS,
  canRemindBirthday,
  offsetKey,
  offsetLabel,
  type BirthdayReminderOffset,
  type BirthdayReminderPreset,
} from "@/modules/family-tree/domain/birthday-reminder";
import type { FamilyPerson } from "@/modules/family-tree/domain/family-graph";
import { BirthdayReminderOffsetEditor } from "@/modules/family-tree/presentation/components/birthday-reminder-offset-editor";

type CalendarStatus = { connected: boolean; email: string | null };

export function FamilyPersonReminderEdit({
  locale,
  birthDate,
  person,
  presets,
  calendar,
  enabled,
  offsets,
  onEnabledChange,
  onOffsetsChange,
}: {
  locale: "es" | "en";
  birthDate: string;
  person?: FamilyPerson;
  presets: BirthdayReminderPreset[];
  calendar?: CalendarStatus;
  enabled: boolean;
  offsets: BirthdayReminderOffset[];
  onEnabledChange: (enabled: boolean) => void;
  onOffsetsChange: (offsets: BirthdayReminderOffset[]) => void;
}) {
  const defaultPreset = presets.find((item) => item.isDefault) ?? presets[0];
  const [open, setOpen] = useState(false);
  const [timeZone, setTimeZone] = useState("UTC");
  const hasBirth = canRemindBirthday(birthDate);
  const t = locale === "es"
    ? {
        title: "Recordar cumpleaños",
        global: "Estos avisos valen para todas las personas del árbol.",
        off: "Desactivado",
        active: "activo",
        reminders: "avisos",
        enable: "Activar para esta persona",
        connect: "Conectar Google Calendar",
        connected: "Avisos en",
        needDate: "Añade la fecha de nacimiento para configurar avisos.",
        needCalendar: "Conecta Google Calendar para activar el recordatorio.",
        expand: "Ver y editar avisos",
        collapse: "Ocultar avisos",
      }
    : {
        title: "Remember birthday",
        global: "These reminders apply to everyone in the tree.",
        off: "Off",
        active: "on",
        reminders: "reminders",
        enable: "Enable for this person",
        connect: "Connect Google Calendar",
        connected: "Reminders go to",
        needDate: "Add a date of birth to configure reminders.",
        needCalendar: "Connect Google Calendar to enable the reminder.",
        expand: "View and edit reminders",
        collapse: "Hide reminders",
      };

  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [person?.id]);

  const calendarHref = useMemo(
    () => `/api/auth/google/calendar?locale=${locale}&next=${encodeURIComponent(`/${locale}/app/family`)}&timeZone=${encodeURIComponent(timeZone)}`,
    [locale, timeZone],
  );

  const summary = !hasBirth
    ? t.needDate
    : enabled
      ? `${offsets.length} ${t.reminders} · ${t.active}`
      : t.off;

  const preview = offsets.slice(0, 2).map((offset) => offsetLabel(offset, locale, { includeTime: false })).join(" · ");

  return (
    <div className="md:col-span-3 rounded-2xl border border-[var(--line)] bg-[#fbfaf6]">
      <input type="hidden" name="birthdayReminderField" value="1" />
      <input type="hidden" name="timeZone" value={timeZone} />
      <input type="hidden" name="birthdayReminderPresetId" value={defaultPreset?.id ?? person?.birthdayReminderPresetId ?? ""} />
      <input type="hidden" name="birthdayReminderOffsets" value={JSON.stringify(offsets)} />
      {enabled && <input type="hidden" name="birthdayReminderEnabled" value="on" />}
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <Cake size={16} className="shrink-0 text-[var(--moss)]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[var(--ink)]">{t.title}</p>
          <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{summary}{enabled && preview ? ` — ${preview}${offsets.length > 2 ? "…" : ""}` : ""}</p>
        </div>
        <ChevronDown size={16} className={`shrink-0 text-[var(--muted)] transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-4 border-t border-[var(--line)] px-4 py-4">
          <p className="text-xs leading-5 text-[var(--muted)]">{hasBirth ? t.global : t.needDate}</p>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={enabled}
              disabled={!hasBirth || !calendar?.connected}
              onChange={(event) => onEnabledChange(event.target.checked)}
            />
            {t.enable}
          </label>
          {hasBirth && !calendar?.connected && (
            <p className="text-xs text-[var(--muted)]">{t.needCalendar}</p>
          )}
          {hasBirth && (
            <>
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-2.5 text-[11px]">
                {calendar?.connected ? (
                  <>
                    <CalendarPlus size={14} className="text-[var(--moss)]" />
                    <span>{t.connected} <strong>{calendar.email}</strong></span>
                  </>
                ) : (
                  <a className="btn btn-secondary !px-2.5 !py-1.5 text-[11px]" href={calendarHref}>{t.connect}</a>
                )}
              </div>
              <BirthdayReminderOffsetEditor locale={locale} offsets={offsets} onChange={onOffsetsChange} compact />
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function initialReminderOffsets(person?: FamilyPerson, presets: BirthdayReminderPreset[] = []) {
  const linked = presets.find((item) => item.id === person?.birthdayReminderPresetId);
  const defaultPreset = presets.find((item) => item.isDefault) ?? presets[0];
  const source = linked ?? defaultPreset;
  return source?.offsets?.length ? source.offsets : DEFAULT_BIRTHDAY_OFFSETS;
}

export function offsetsEqual(a: BirthdayReminderOffset[], b: BirthdayReminderOffset[]) {
  return JSON.stringify(a.map(offsetKey)) === JSON.stringify(b.map(offsetKey));
}
