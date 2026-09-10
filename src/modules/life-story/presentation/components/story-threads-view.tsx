"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, GitCommitHorizontal } from "lucide-react";
import {
  entryTone,
  momentFlagLabel,
  type LifeEntry,
  type LifeEntryLink,
} from "@/modules/life-story/domain/life-entry";
import {
  buildLifeEntryThreads,
  learningEntries,
  linkBetween,
  turningPointEntries,
} from "@/modules/life-story/domain/life-entry-threads";
import { formatStoryDate } from "@/shared/lib/utils";
import { DeleteEntryButton } from "./delete-entry-button";
import { EntryFieldOriginBadge } from "./text-origin-badge";

function ThreadEntryCard({
  entry,
  locale,
  editLabel,
}: {
  entry: LifeEntry;
  locale: "es" | "en";
  editLabel: string;
}) {
  return (
    <article className="card p-4 shadow-none">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
            {formatStoryDate(entry.startDate, entry.datePrecision, locale)}
          </p>
          <h3 className="display mt-1 flex flex-wrap items-center gap-2 text-lg leading-snug">{entry.title}<EntryFieldOriginBadge entry={entry} field="title" locale={locale} /></h3>
        </div>
        <div className="flex shrink-0">
          <Link href={`/${locale}/app/entries/${entry.id}/edit`} className="btn btn-quiet !p-2 text-xs">{editLabel}</Link>
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
        <div className="mt-3 text-sm leading-6 text-[var(--ink)]">
          <span className="mb-1 flex flex-wrap items-center gap-2">
            <span className="font-bold text-[var(--moss-deep)]">{locale === "es" ? "Aprendizaje" : "Lesson"}</span>
            <EntryFieldOriginBadge entry={entry} field="learning" locale={locale} />
          </span>
          <p className="mt-1">{entry.learning}</p>
        </div>
      )}
      <span className="mt-3 inline-block h-1.5 w-8 rounded-full" style={{ background: entryTone(entry.changeDirection) }} aria-hidden />
    </article>
  );
}

export function StoryThreadsView({
  entries,
  links,
  locale,
}: {
  entries: LifeEntry[];
  links: LifeEntryLink[];
  locale: "es" | "en";
}) {
  const turns = useMemo(() => turningPointEntries(entries), [entries]);
  const threads = useMemo(() => buildLifeEntryThreads(entries, links), [entries, links]);
  const lessons = useMemo(() => learningEntries(entries), [entries]);

  const t = locale === "es"
    ? {
        hint: "Los giros marcan lo que cambió de verdad. Los hilos muestran qué llevó a qué. Los aprendizajes son a lo que puedes volver cuando necesites claridad.",
        turns: "Espina de la vida",
        turnsBody: "Solo los momentos que marcaste como críticos, inflexiones o giros vitales.",
        turnsEmpty: "Aún no has marcado giros. Al editar una experiencia, elige “momento crítico”, “punto de inflexión” o “giro vital”.",
        threads: "Hilos",
        threadsBody: "Cadenas de experiencias que relacionaste o que fueron consecuencia una de otra.",
        threadsEmpty: "Aún no hay hilos. En una experiencia, usa “Relacionar con otra experiencia” para unirla.",
        lessons: "Aprendizajes",
        lessonsEmpty: "Cuando escribas qué aprendiste, aparecerá aquí.",
        consequence: "Consecuencia",
        related: "Relacionada",
        edit: "Editar",
        count: (n: number) => (n === 1 ? "1 momento" : `${n} momentos`),
      }
    : {
        hint: "Turning points mark what actually changed. Threads show what led to what. Lessons are what you can return to when you need clarity.",
        turns: "Life spine",
        turnsBody: "Only the moments you marked as critical, inflection or turning points.",
        turnsEmpty: "You have not marked turning points yet. When editing an experience, choose “critical moment”, “inflection point” or “turning point”.",
        threads: "Threads",
        threadsBody: "Chains of experiences you linked, or that followed as a consequence.",
        threadsEmpty: "There are no threads yet. In an experience, use “Link to another experience” to connect it.",
        lessons: "Lessons",
        lessonsEmpty: "When you write what you learned, it will appear here.",
        consequence: "Consequence",
        related: "Related",
        edit: "Edit",
        count: (n: number) => (n === 1 ? "1 moment" : `${n} moments`),
      };

  return (
    <div className="mt-8 space-y-10">
      <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">{t.hint}</p>

      <section>
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h2 className="display text-2xl">{t.turns}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{t.turnsBody}</p>
          </div>
          {turns.length > 0 && <span className="text-xs font-semibold text-[var(--muted)]">{t.count(turns.length)}</span>}
        </div>
        {turns.length === 0 ? (
          <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--muted)]">{t.turnsEmpty}</p>
        ) : (
          <ol className="story-spine mt-5">
            {turns.map((entry) => (
              <li key={entry.id} className="story-spine-item">
                <span className="story-spine-dot" style={{ background: entryTone(entry.changeDirection) }} />
                <ThreadEntryCard entry={entry} locale={locale} editLabel={t.edit} />
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2 className="display text-2xl">{t.threads}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{t.threadsBody}</p>
        {threads.length === 0 ? (
          <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--muted)]">{t.threadsEmpty}</p>
        ) : (
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {threads.map((thread) => (
              <article key={thread.id} className="rounded-2xl border border-[var(--line)] bg-[#fbfaf6] p-4">
                {thread.entries.map((entry, index) => {
                  const previous = thread.entries[index - 1];
                  const relation = previous ? linkBetween(thread.links, previous.id, entry.id) : undefined;
                  return (
                    <div key={entry.id}>
                      {relation && (
                        <p className="flex items-center gap-2 py-3 pl-1 text-[11px] font-bold uppercase tracking-wide text-[var(--moss)]">
                          <GitCommitHorizontal size={14} />
                          {relation.relation === "consequence" ? t.consequence : t.related}
                        </p>
                      )}
                      <ThreadEntryCard entry={entry} locale={locale} editLabel={t.edit} />
                    </div>
                  );
                })}
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="display text-2xl">{t.lessons}</h2>
        {lessons.length === 0 ? (
          <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--muted)]">{t.lessonsEmpty}</p>
        ) : (
          <div className="mt-5 grid gap-3">
            {lessons.map((entry) => (
              <Link
                key={entry.id}
                href={`/${locale}/app/entries/${entry.id}/edit`}
                className="card flex items-start justify-between gap-4 p-4 shadow-none transition hover:border-[#b9d0b8]"
              >
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
                    {formatStoryDate(entry.startDate, entry.datePrecision, locale)} · {entry.title}
                  </p>
                  <p className="mt-2 text-sm leading-6">{entry.learning}</p>
                  <div className="mt-2">
                    <EntryFieldOriginBadge entry={entry} field="learning" locale={locale} />
                  </div>
                </div>
                <ArrowRight size={16} className="mt-1 shrink-0 text-[var(--moss)]" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
