"use client";

import type { HumanTextOrigin } from "@/modules/life-story/domain/life-entry-text-origin";
import { textOriginBadgeLabel } from "@/modules/life-story/domain/life-entry-text-origin";
import type { LifeEntry, LifeEntryProseField } from "@/modules/life-story/domain/life-entry";

export function TextOriginBadge({
  origin,
  containsAi,
  locale,
}: {
  origin: HumanTextOrigin | null;
  containsAi: boolean;
  locale: "es" | "en";
}) {
  const label = textOriginBadgeLabel(origin, containsAi, locale);
  if (!label) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        containsAi ? "bg-[#f3eef8] text-[#6b4c7a]" : "bg-[#eff4ed] text-[var(--moss-deep)]"
      }`}
    >
      {label}
    </span>
  );
}

export function EntryFieldOriginBadge({
  entry,
  field,
  locale,
}: {
  entry: LifeEntry;
  field: LifeEntryProseField;
  locale: "es" | "en";
}) {
  return (
    <TextOriginBadge
      origin={entry.textOrigins?.[field] ?? null}
      containsAi={entry.textContainsAi?.[field] === true}
      locale={locale}
    />
  );
}
