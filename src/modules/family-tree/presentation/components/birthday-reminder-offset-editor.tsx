"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  DEFAULT_BIRTHDAY_OFFSETS,
  offsetKey,
  offsetLabel,
  REMINDER_TIMING_OPTIONS,
  reminderTimingLabel,
  type BirthdayReminderOffset,
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
  const [selectedOptionId, setSelectedOptionId] = useState(REMINDER_TIMING_OPTIONS[1]?.id ?? REMINDER_TIMING_OPTIONS[0].id);
  const [customTime, setCustomTime] = useState("09:00");
  const t = locale === "es"
    ? { add: "Añadir aviso", when: "Cuándo", at: "A las", empty: "Añade al menos un aviso." }
    : { add: "Add reminder", when: "When", at: "At", empty: "Add at least one reminder." };

  function addOffset(offset: BirthdayReminderOffset) {
    const next = offsets.some((item) => offsetKey(item) === offsetKey(offset)) ? offsets : [...offsets, offset].slice(0, 8);
    onChange(next);
  }

  function addCustom() {
    const option = REMINDER_TIMING_OPTIONS.find((item) => item.id === selectedOptionId) ?? REMINDER_TIMING_OPTIONS[0];
    const [hour, minute] = customTime.split(":").map(Number);
    addOffset({
      ...option.offset,
      hour: Number.isFinite(hour) ? hour : option.offset.hour,
      minute: Number.isFinite(minute) ? minute : option.offset.minute,
    });
  }

  return (
    <div className={`min-w-0 space-y-3 ${compact ? "" : "mt-2"}`}>
      <ul className="space-y-2">
        {offsets.map((offset) => (
          <li key={offsetKey(offset)} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs">
            <span className="min-w-0 break-words">{offsetLabel(offset, locale)}</span>
            <button type="button" className="btn btn-quiet shrink-0 !p-1" aria-label={locale === "es" ? "Quitar aviso" : "Remove reminder"} onClick={() => onChange(offsets.filter((item) => offsetKey(item) !== offsetKey(offset)))}>
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
      <div className={`grid gap-2 rounded-xl bg-white p-2.5 ${compact ? "" : "sm:grid-cols-[1fr_auto_auto] sm:items-end"}`}>
        <label>
          <span className="field-label">{t.when}</span>
          <select className="select !py-2 text-sm" value={selectedOptionId} onChange={(event) => setSelectedOptionId(event.target.value)}>
            {REMINDER_TIMING_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>{reminderTimingLabel(option, locale)}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">{t.at}</span>
          <input className="input !py-2 text-sm" type="time" value={customTime} onChange={(event) => setCustomTime(event.target.value)} />
        </label>
        <button type="button" className={`btn btn-secondary text-xs ${compact ? "w-full !py-2" : "!px-3 !py-2"}`} onClick={addCustom}><Plus size={13} />{t.add}</button>
      </div>
    </div>
  );
}

export function defaultOffsetsFromPresets(presets: { isDefault: boolean; offsets: BirthdayReminderOffset[] }[]) {
  const preset = presets.find((item) => item.isDefault) ?? presets[0];
  return preset?.offsets?.length ? preset.offsets : DEFAULT_BIRTHDAY_OFFSETS;
}
