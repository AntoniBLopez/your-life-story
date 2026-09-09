"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  DEFAULT_BIRTHDAY_OFFSETS,
  offsetKey,
  offsetLabel,
  type BirthdayReminderOffset,
  type ReminderUnit,
} from "@/modules/family-tree/domain/birthday-reminder";

const QUICK: BirthdayReminderOffset[] = [
  { unit: "days", amount: 0, hour: 9, minute: 0 },
  { unit: "days", amount: 1, hour: 20, minute: 0 },
  { unit: "days", amount: 10, hour: 9, minute: 0 },
  { unit: "weeks", amount: 1, hour: 9, minute: 0 },
  { unit: "months", amount: 1, hour: 9, minute: 0 },
];

export function BirthdayReminderOffsetEditor({
  locale,
  offsets,
  onChange,
  compact,
}: {
  locale: "es" | "en";
  offsets: BirthdayReminderOffset[];
  onChange: (offsets: BirthdayReminderOffset[]) => void;
  compact?: boolean;
}) {
  const [customAmount, setCustomAmount] = useState(3);
  const [customUnit, setCustomUnit] = useState<ReminderUnit>("days");
  const [customTime, setCustomTime] = useState("09:00");
  const t = locale === "es"
    ? { add: "Añadir aviso", custom: "Personalizado", days: "días", weeks: "semanas", months: "meses", at: "a las", empty: "Añade al menos un aviso." }
    : { add: "Add reminder", custom: "Custom", days: "days", weeks: "weeks", months: "months", at: "at", empty: "Add at least one reminder." };

  function addOffset(offset: BirthdayReminderOffset) {
    const next = offsets.some((item) => offsetKey(item) === offsetKey(offset)) ? offsets : [...offsets, offset].slice(0, 8);
    onChange(next);
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

  return (
    <div className={`space-y-3 ${compact ? "" : "mt-2"}`}>
      <ul className="space-y-2">
        {offsets.map((offset) => (
          <li key={offsetKey(offset)} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-xs">
            <span>{offsetLabel(offset, locale)}</span>
            <button type="button" className="btn btn-quiet !p-1" aria-label={locale === "es" ? "Quitar aviso" : "Remove reminder"} onClick={() => onChange(offsets.filter((item) => offsetKey(item) !== offsetKey(offset)))}>
              <Trash2 size={13} />
            </button>
          </li>
        ))}
        {offsets.length === 0 && <li className="text-xs text-[var(--muted)]">{t.empty}</li>}
      </ul>
      <div className="flex flex-wrap gap-1.5">
        {QUICK.map((offset) => (
          <button key={offsetKey(offset)} type="button" className="btn btn-secondary !px-2.5 !py-1 text-[11px]" onClick={() => addOffset(offset)}>
            <Plus size={11} />
            {offsetLabel(offset, locale, { includeTime: false })}
          </button>
        ))}
      </div>
      <div className="grid gap-2 rounded-xl bg-white p-2.5 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
        <label>
          <span className="field-label">{t.custom}</span>
          <input className="input !py-2 text-sm" type="number" min={0} max={366} value={customAmount} onChange={(event) => setCustomAmount(Number(event.target.value))} />
        </label>
        <label>
          <span className="field-label">{locale === "es" ? "Unidad" : "Unit"}</span>
          <select className="select !py-2 text-sm" value={customUnit} onChange={(event) => setCustomUnit(event.target.value as ReminderUnit)}>
            <option value="days">{t.days}</option>
            <option value="weeks">{t.weeks}</option>
            <option value="months">{t.months}</option>
          </select>
        </label>
        <label>
          <span className="field-label">{t.at}</span>
          <input className="input !py-2 text-sm" type="time" value={customTime} onChange={(event) => setCustomTime(event.target.value)} />
        </label>
        <button type="button" className="btn btn-secondary !px-3 !py-2 text-xs" onClick={addCustom}><Plus size={13} />{t.add}</button>
      </div>
    </div>
  );
}

export function defaultOffsetsFromPresets(presets: { isDefault: boolean; offsets: BirthdayReminderOffset[] }[]) {
  const preset = presets.find((item) => item.isDefault) ?? presets[0];
  return preset?.offsets?.length ? preset.offsets : DEFAULT_BIRTHDAY_OFFSETS;
}
