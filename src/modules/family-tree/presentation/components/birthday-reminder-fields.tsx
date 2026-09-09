"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, CalendarPlus, Plus, Trash2 } from "lucide-react";
import {
  DEFAULT_BIRTHDAY_OFFSETS,
  canRemindBirthday,
  defaultPresetName,
  offsetKey,
  offsetLabel,
  type BirthdayReminderOffset,
  type BirthdayReminderPreset,
  type ReminderUnit,
} from "@/modules/family-tree/domain/birthday-reminder";
import type { FamilyPerson } from "@/modules/family-tree/domain/family-graph";

type CalendarStatus = { connected: boolean; email: string | null };

const QUICK: BirthdayReminderOffset[] = [
  { unit: "days", amount: 0, hour: 9, minute: 0 },
  { unit: "days", amount: 1, hour: 20, minute: 0 },
  { unit: "days", amount: 10, hour: 9, minute: 0 },
  { unit: "weeks", amount: 1, hour: 9, minute: 0 },
  { unit: "months", amount: 1, hour: 9, minute: 0 },
];

export function BirthdayReminderFields({
  locale,
  birthDate,
  person,
  presets,
  calendar,
}: {
  locale: "es" | "en";
  birthDate: string;
  person?: FamilyPerson;
  presets: BirthdayReminderPreset[];
  calendar?: CalendarStatus;
}) {
  const defaultPreset = presets.find((item) => item.isDefault) ?? presets[0];
  const initialPreset = presets.find((item) => item.id === person?.birthdayReminderPresetId) ?? defaultPreset;
  const [enabled, setEnabled] = useState(Boolean(person?.birthdayReminderEnabled));
  const [presetId, setPresetId] = useState(initialPreset?.id ?? "");
  const [presetName, setPresetName] = useState(initialPreset?.name ?? defaultPresetName(locale));
  const [offsets, setOffsets] = useState<BirthdayReminderOffset[]>(initialPreset?.offsets ?? DEFAULT_BIRTHDAY_OFFSETS);
  const [customAmount, setCustomAmount] = useState(3);
  const [customUnit, setCustomUnit] = useState<ReminderUnit>("days");
  const [customTime, setCustomTime] = useState("09:00");
  const [timeZone, setTimeZone] = useState("UTC");
  const hasBirth = canRemindBirthday(birthDate);
  const t = locale === "es"
    ? {
        title: "Recordatorio de cumpleaños",
        help: "Activa el mismo interruptor en otras personas para reutilizar este conjunto de avisos en Google Calendar.",
        needDate: "Añade la fecha de nacimiento para poder avisarte.",
        connect: "Conectar Google Calendar",
        connected: "Avisos en",
        reconnect: "Cambiar cuenta",
        settings: "También puedes conectarlo en Ajustes.",
        set: "Conjunto de avisos",
        newSet: "Nuevo conjunto",
        setName: "Nombre del conjunto",
        default: "Usar este conjunto al activar el interruptor en otras personas",
        add: "Añadir aviso",
        custom: "Personalizado",
        days: "días",
        weeks: "semanas",
        months: "meses",
        at: "a las",
        empty: "Añade al menos un aviso: el mismo día, días antes o un mes antes.",
      }
    : {
        title: "Birthday reminder",
        help: "Turn the same switch on for other people to reuse this reminder set in Google Calendar.",
        needDate: "Add a date of birth to be notified.",
        connect: "Connect Google Calendar",
        connected: "Reminders go to",
        reconnect: "Switch account",
        settings: "You can also connect it in Settings.",
        set: "Reminder set",
        newSet: "New set",
        setName: "Set name",
        default: "Use this set when turning the switch on for other people",
        add: "Add reminder",
        custom: "Custom",
        days: "days",
        weeks: "weeks",
        months: "months",
        at: "at",
        empty: "Add at least one reminder: same day, days before, or a month before.",
      };

  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  }, []);

  useEffect(() => {
    const selected = presets.find((item) => item.id === person?.birthdayReminderPresetId) ?? presets.find((item) => item.isDefault) ?? presets[0];
    setEnabled(Boolean(person?.birthdayReminderEnabled));
    setPresetId(selected?.id ?? "");
    setPresetName(selected?.name ?? defaultPresetName(locale));
    setOffsets(selected?.offsets?.length ? selected.offsets : DEFAULT_BIRTHDAY_OFFSETS);
  }, [person, presets, locale]);

  const calendarHref = useMemo(() => {
    const next = encodeURIComponent(`/${locale}/app/family`);
    return `/api/auth/google/calendar?locale=${locale}&next=${next}&timeZone=${encodeURIComponent(timeZone)}`;
  }, [locale, timeZone]);

  function addOffset(offset: BirthdayReminderOffset) {
    setOffsets((current) => current.some((item) => offsetKey(item) === offsetKey(offset)) ? current : [...current, offset].slice(0, 8));
  }

  function addCustom() {
    const [hour, minute] = customTime.split(":").map(Number);
    addOffset({
      unit: customAmount === 0 ? "days" : customUnit,
      amount: customAmount,
      hour: Number.isFinite(hour) ? hour : 9,
      minute: Number.isFinite(minute) ? minute : 0,
    });
  }

  function choosePreset(id: string) {
    setPresetId(id);
    if (!id) {
      setPresetName(defaultPresetName(locale));
      setOffsets(DEFAULT_BIRTHDAY_OFFSETS);
      return;
    }
    const selected = presets.find((item) => item.id === id);
    if (!selected) return;
    setPresetName(selected.name);
    setOffsets(selected.offsets);
  }

  return (
    <div className="md:col-span-3 rounded-2xl border border-[var(--line)] bg-[#fbfaf6] p-4">
      <input type="hidden" name="timeZone" value={timeZone} />
      <input type="hidden" name="birthdayReminderPresetId" value={presetId} />
      <input type="hidden" name="birthdayReminderOffsets" value={JSON.stringify(offsets)} />
      {enabled && <input type="hidden" name="birthdayReminderEnabled" value="on" />}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-[var(--ink)]">
            <Bell size={16} className="text-[var(--moss)]" />
            {t.title}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{hasBirth ? t.help : t.needDate}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled && hasBirth}
          disabled={!hasBirth}
          onClick={() => setEnabled((value) => !value)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${enabled && hasBirth ? "bg-[var(--moss)]" : "bg-[#d8d3c8]"} disabled:opacity-40`}
        >
          <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition ${enabled && hasBirth ? "translate-x-5" : ""}`} />
        </button>
      </div>
      {enabled && hasBirth && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 text-xs">
            {calendar?.connected ? (
              <>
                <CalendarPlus size={15} className="text-[var(--moss)]" />
                <span>{t.connected} <strong>{calendar.email}</strong></span>
                <a className="font-bold text-[var(--moss-deep)] underline" href={calendarHref}>{t.reconnect}</a>
              </>
            ) : (
              <>
                <a className="btn btn-primary !px-3 !py-2 text-xs" href={calendarHref}>{t.connect}</a>
                <span className="text-[var(--muted)]">{t.settings}</span>
              </>
            )}
          </div>
          <label>
            <span className="field-label">{t.set}</span>
            <select className="select" value={presetId} onChange={(event) => choosePreset(event.target.value)}>
              <option value="">{t.newSet}</option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.name}{preset.isDefault ? (locale === "es" ? " · predeterminado" : " · default") : ""}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">{t.setName}</span>
            <input className="input" name="birthdayReminderPresetName" value={presetName} onChange={(event) => setPresetName(event.target.value)} maxLength={80} />
          </label>
          <label className="flex items-start gap-2 text-xs font-semibold leading-5 text-[var(--ink)]">
            <input key={presetId || "new"} type="checkbox" name="birthdayReminderDefault" defaultChecked={!presetId || Boolean(presets.find((item) => item.id === presetId)?.isDefault)} className="mt-0.5 accent-[var(--moss)]" />
            {t.default}
          </label>
          <ul className="space-y-2">
            {offsets.map((offset) => (
              <li key={offsetKey(offset)} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm">
                <span>{offsetLabel(offset, locale)}</span>
                <button type="button" className="btn btn-quiet !p-1" aria-label={locale === "es" ? "Quitar aviso" : "Remove reminder"} onClick={() => setOffsets((current) => current.filter((item) => offsetKey(item) !== offsetKey(offset)))}>
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
            {offsets.length === 0 && <li className="text-xs text-[var(--muted)]">{t.empty}</li>}
          </ul>
          <div className="flex flex-wrap gap-2">
            {QUICK.map((offset) => (
              <button key={offsetKey(offset)} type="button" className="btn btn-secondary !px-3 !py-1.5 text-xs" onClick={() => addOffset(offset)}>
                <Plus size={12} />
                {offsetLabel(offset, locale, { includeTime: false })}
              </button>
            ))}
          </div>
          <div className="grid gap-2 rounded-xl bg-white p-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
            <label>
              <span className="field-label">{t.custom}</span>
              <input className="input" type="number" min={0} max={366} value={customAmount} onChange={(event) => setCustomAmount(Number(event.target.value))} />
            </label>
            <label>
              <span className="field-label">{locale === "es" ? "Unidad" : "Unit"}</span>
              <select className="select" value={customUnit} onChange={(event) => setCustomUnit(event.target.value as ReminderUnit)}>
                <option value="days">{t.days}</option>
                <option value="weeks">{t.weeks}</option>
                <option value="months">{t.months}</option>
              </select>
            </label>
            <label>
              <span className="field-label">{t.at}</span>
              <input className="input" type="time" value={customTime} onChange={(event) => setCustomTime(event.target.value)} />
            </label>
            <button type="button" className="btn btn-secondary" onClick={addCustom}><Plus size={15} />{t.add}</button>
          </div>
        </div>
      )}
    </div>
  );
}
