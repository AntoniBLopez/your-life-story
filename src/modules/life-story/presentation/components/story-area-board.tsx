"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Plus } from "lucide-react";
import {
  LIFE_AREAS,
  entryTone,
  lifeAreaLabel,
  momentFlagLabel,
  type LifeArea,
  type LifeEntry,
} from "@/modules/life-story/domain/life-entry";
import { formatStoryDate } from "@/shared/lib/utils";
import { DeleteEntryButton } from "./delete-entry-button";
import { EntryFieldOriginBadge } from "./text-origin-badge";

function entryAreas(entry: LifeEntry): LifeArea[] {
  return entry.lifeAreas?.length ? entry.lifeAreas : entry.lifeArea ? [entry.lifeArea] : ["general"];
}

export function StoryAreaBoard({
  entries,
  locale,
}: {
  entries: LifeEntry[];
  locale: "es" | "en";
}) {
  const columns = useMemo(() => {
    return LIFE_AREAS.map((area) => ({
      area,
      items: entries
        .filter((entry) => entryAreas(entry).includes(area))
        .sort((left, right) => right.startDate.localeCompare(left.startDate)),
    })).filter((column) => column.items.length > 0);
  }, [entries]);

  const t = locale === "es"
    ? {
        hint: "Las experiencias aparecen en cada área que les asignaste. Ábrela para editarla.",
        count: (n: number) => (n === 1 ? "1 experiencia" : `${n} experiencias`),
        edit: "Editar",
      }
    : {
        hint: "Experiences appear in every area you assigned. Open one to edit it.",
        count: (n: number) => (n === 1 ? "1 experience" : `${n} experiences`),
        edit: "Edit",
      };

  if (columns.length === 0) return null;

  return (
    <div className="mt-8">
      <p className="text-sm text-[var(--muted)]">{t.hint}</p>
      <div className="mt-4 flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <section
            key={column.area}
            className="flex w-[min(20rem,calc(100vw-3rem))] shrink-0 flex-col rounded-2xl border border-[var(--line)] bg-[#fbfaf6] p-3"
          >
            <header className="flex items-baseline justify-between gap-3 px-1 pb-3">
              <h2 className="display text-xl">{lifeAreaLabel(column.area, locale)}</h2>
              <span className="text-xs font-semibold text-[var(--muted)]">{t.count(column.items.length)}</span>
            </header>
            <div className="flex flex-col gap-3">
              {column.items.map((entry) => (
                <article key={entry.id} className="card p-4 shadow-none">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
                        {formatStoryDate(entry.startDate, entry.datePrecision, locale)}
                      </p>
                      <h3 className="display mt-1 flex flex-wrap items-center gap-2 text-lg leading-snug">{entry.title}<EntryFieldOriginBadge entry={entry} field="title" locale={locale} /></h3>
                    </div>
                    <div className="flex shrink-0">
                      <Link href={`/${locale}/app/entries/${entry.id}/edit`} className="btn btn-quiet !p-2 text-xs">{t.edit}</Link>
                      <DeleteEntryButton entryId={entry.id} locale={locale} />
                    </div>
                  </div>
                  {entry.momentFlags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {entry.momentFlags.map((flag) => (
                        <span key={flag} className="rounded-full bg-[#fff0e5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#8a5a3d]">
                          {momentFlagLabel(flag, locale)}
                        </span>
                      ))}
                    </div>
                  )}
                  {entry.learning && (
                    <div className="mt-3">
                      <EntryFieldOriginBadge entry={entry} field="learning" locale={locale} />
                      <p className="mt-1 line-clamp-3 text-sm leading-6 text-[var(--ink)]">{entry.learning}</p>
                    </div>
                  )}
                  <span
                    className="mt-3 inline-block h-1.5 w-8 rounded-full"
                    style={{ background: entryTone(entry.changeDirection) }}
                    aria-hidden
                  />
                </article>
              ))}
              <Link
                href={`/${locale}/app/entries/new`}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--line)] px-3 py-2.5 text-sm font-bold text-[var(--moss-deep)] hover:bg-white"
              >
                <Plus size={14} />
                {locale === "es" ? "Añadir aquí" : "Add here"}
              </Link>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
