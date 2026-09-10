"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, Filter, GitCommitHorizontal, LayoutGrid, Plus, Sparkles } from "lucide-react";
import { type LifeEntry, type LifeEntryLink, entryTone, LIFE_AREAS, lifeAreaLabel, momentFlagLabel } from "@/modules/life-story/domain/life-entry";
import { formatStoryDate, titleCase } from "@/shared/lib/utils";
import { DeleteEntryButton } from "./delete-entry-button";
import { EntryFieldOriginBadge } from "./text-origin-badge";
import { StoryAreaBoard } from "./story-area-board";
import { StoryThreadsView } from "./story-threads-view";

type ExampleEntry = {
  date: string;
  precision: LifeEntry["datePrecision"];
  title: string;
  narrative: string;
  area: LifeEntry["lifeArea"];
  direction: LifeEntry["changeDirection"];
  tags: string[];
  learning: string;
};

function getExampleEntries(locale: "es" | "en"): ExampleEntry[] {
  if (locale === "es") {
    return [
      {
        date: "2024-03-12",
        precision: "day",
        title: "Un cambio de dirección",
        narrative: "Decidí hacer espacio para un trabajo más alineado con la vida que quiero construir.",
        area: "work",
        direction: "improved",
        tags: ["trabajo", "decisiones"],
        learning: "Pedir ayuda acelera los cambios importantes.",
      },
      {
        date: "2023-08-21",
        precision: "day",
        title: "Un verano para volver a mí",
        narrative: "Unos días tranquilos con la familia me recordaron qué conversaciones quiero cuidar.",
        area: "relationships",
        direction: "mixed",
        tags: ["familia", "cuidado"],
        learning: "La presencia también es una forma de cuidado.",
      },
    ];
  }
  return [
    {
      date: "2024-03-12",
      precision: "day",
      title: "A change of direction",
      narrative: "I made room for work that better fits the life I want to build.",
      area: "work",
      direction: "improved",
      tags: ["work", "decisions"],
      learning: "Asking for help speeds up important changes.",
    },
    {
      date: "2023-08-21",
      precision: "day",
      title: "A summer to come back to myself",
      narrative: "Quiet days with family reminded me which conversations I want to nurture.",
      area: "relationships",
      direction: "mixed",
      tags: ["family", "care"],
      learning: "Presence is also a form of care.",
    },
  ];
}

function StoryEmptyState({
  locale,
  view,
  t,
}: {
  locale: "es" | "en";
  view: "timeline" | "areas" | "threads";
  t: { empty: string; emptyBody: string; example: string; exampleAreas: string; exampleThreads: string; add: string };
}) {
  const examples = getExampleEntries(locale);

  return (
    <div className="mt-8">
      <div className="card p-8 text-center sm:p-10">
        <Sparkles className="mx-auto text-[var(--moss)]" />
        <h2 className="display mt-4 text-2xl">{t.empty}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">{t.emptyBody}</p>
        <Link href={`/${locale}/app/entries/new`} className="btn btn-primary mt-6"><Plus size={16} />{t.add}</Link>
      </div>
      <div className="mt-6">
        <p className="text-center text-xs font-bold uppercase tracking-[.08em] text-[var(--muted)]">
          {view === "timeline" ? t.example : view === "areas" ? t.exampleAreas : t.exampleThreads}
        </p>
        {view === "timeline" ? (
          <div className="placeholder-preview timeline mt-4">
            {examples.map((entry) => (
              <article key={entry.title} className="timeline-item" aria-hidden="true">
                <span className="timeline-dot" style={{ background: entryTone(entry.direction) }} />
                <div className="card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="eyebrow !text-[.66rem]">{formatStoryDate(entry.date, entry.precision, locale)}</p>
                      <h2 className="display mt-2 text-2xl">{entry.title}</h2>
                    </div>
                    <span className="placeholder-badge">{locale === "es" ? "Ejemplo" : "Example"}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{entry.narrative}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="pill" style={{ color: entryTone(entry.direction), background: `${entryTone(entry.direction)}18` }}>{titleCase(entry.direction)}</span>
                    {entry.tags.map((item) => <span className="pill" key={item}>#{item}</span>)}
                  </div>
                  <div className="mt-4 rounded-xl bg-[#f1f6ee] p-3 text-sm">
                    <span className="font-bold text-[var(--moss-deep)]">{locale === "es" ? "Aprendizaje: " : "Lesson: "}</span>
                    {entry.learning}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : view === "areas" ? (
          <div className="placeholder-preview mt-4 flex gap-4 overflow-hidden" aria-hidden="true">
            {["work", "relationships"].map((area) => (
              <section key={area} className="w-64 shrink-0 rounded-2xl border border-dashed border-[var(--line)] bg-[#fbfaf6] p-3">
                <p className="display text-lg">{lifeAreaLabel(area as LifeEntry["lifeArea"], locale)}</p>
                {examples.filter((entry) => entry.area === area).map((entry) => (
                  <div key={entry.title} className="card mt-3 p-4 shadow-none">
                    <span className="placeholder-badge">{locale === "es" ? "Ejemplo" : "Example"}</span>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">{formatStoryDate(entry.date, entry.precision, locale)}</p>
                    <strong className="display mt-1 block text-base">{entry.title}</strong>
                  </div>
                ))}
              </section>
            ))}
          </div>
        ) : (
          <div className="placeholder-preview mt-4" aria-hidden="true">
            <ol className="story-spine">
              {examples.map((entry) => (
                <li key={entry.title} className="story-spine-item">
                  <span className="story-spine-dot" style={{ background: entryTone(entry.direction) }} />
                  <div className="card p-4">
                    <span className="placeholder-badge">{locale === "es" ? "Ejemplo" : "Example"}</span>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">{formatStoryDate(entry.date, entry.precision, locale)}</p>
                    <strong className="display mt-1 block text-lg">{entry.title}</strong>
                    <p className="mt-2 text-sm leading-6">{entry.learning}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

function storyCountLabel(count: number, locale: "es" | "en") {
  if (locale === "es") {
    return count === 1 ? "1 historia" : `${count} historias`;
  }
  return count === 1 ? "1 story" : `${count} stories`;
}

export function StoryDashboard({ entries, links = [], locale, displayName }: { entries: LifeEntry[]; links?: LifeEntryLink[]; locale: "es" | "en"; displayName?: string }) {
  const [view, setView] = useState<"timeline" | "areas" | "threads">("timeline");
  const [area, setArea] = useState("all");
  const [tag, setTag] = useState("all");
  const tags = useMemo(() => Array.from(new Set(entries.flatMap((entry) => entry.tags))).sort(), [entries]);
  const filtered = entries.filter((entry) => (area === "all" || (entry.lifeAreas ?? [entry.lifeArea]).includes(area as LifeEntry["lifeArea"])) && (tag === "all" || entry.tags.includes(tag)));
  const greeting = displayName
    ? (locale === "es" ? `Hola, ${displayName}` : `Hello, ${displayName}`)
    : (locale === "es" ? "Tu historia" : "Your story");
  const t = locale === "es"
    ? { heading: "Tus experiencias", timeline: "Línea temporal", areas: "Por áreas", threads: "Hilos y giros", add: "Añadir experiencia", all: "Todas las áreas", tags: "Todas las etiquetas", empty: "Aún no has añadido momentos.", emptyBody: "Empieza por una fecha, una situación o un aprendizaje que quieras recordar.", example: "Así podría verse tu línea temporal", exampleAreas: "Así podrían verse tus áreas de vida", exampleThreads: "Así podrían verse tus giros", noMatches: "Ningún momento coincide con estos filtros.", noMatchesBody: "Prueba con otra área o etiqueta.", edit: "Editar", reflect: "¿Quieres reflexionar sobre todo esto?" }
    : { heading: "Your experiences", timeline: "Timeline", areas: "By area", threads: "Threads", add: "Add experience", all: "All areas", tags: "All tags", empty: "You have not added any moments yet.", emptyBody: "Start with a date, situation or lesson you want to remember.", example: "This is how your timeline could look", exampleAreas: "This is how your life areas could look", exampleThreads: "This is how your turning points could look", noMatches: "No moments match these filters.", noMatchesBody: "Try another area or tag.", edit: "Edit", reflect: "Want to reflect on all of this?" };

  return <div className="fade-in">
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <p className="eyebrow">{greeting}</p>
        <h1 className="display mt-2 text-4xl sm:text-5xl">{t.heading}</h1>
      </div>
      <Link className="btn btn-primary" href={`/${locale}/app/entries/new`}><Plus size={16} />{t.add}</Link>
    </div>
    <div className="mt-8 flex flex-col justify-between gap-4 border-b border-[var(--line)] pb-4 lg:flex-row lg:items-center">
      <div className="flex flex-wrap gap-1 rounded-xl bg-[#eef2ec] p-1">
        <button onClick={() => setView("timeline")} className={`btn !rounded-lg !px-3 !py-2 ${view === "timeline" ? "!bg-white !text-[var(--moss-deep)] shadow-sm" : "btn-quiet"}`}>
          <CalendarDays size={15} />{t.timeline}
        </button>
        <button onClick={() => setView("areas")} className={`btn !rounded-lg !px-3 !py-2 ${view === "areas" ? "!bg-white !text-[var(--moss-deep)] shadow-sm" : "btn-quiet"}`}>
          <LayoutGrid size={15} />{t.areas}
        </button>
        <button onClick={() => setView("threads")} className={`btn !rounded-lg !px-3 !py-2 ${view === "threads" ? "!bg-white !text-[var(--moss-deep)] shadow-sm" : "btn-quiet"}`}>
          <GitCommitHorizontal size={15} />{t.threads}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Filter size={15} className="text-[var(--muted)]" />
        <select aria-label="Area filter" value={area} onChange={(event) => setArea(event.target.value)} className="select !w-auto !py-2 text-xs">
          <option value="all">{t.all}</option>
          {LIFE_AREAS.map((value) => <option key={value} value={value}>{lifeAreaLabel(value, locale)}</option>)}
        </select>
        <select aria-label="Tag filter" value={tag} onChange={(event) => setTag(event.target.value)} className="select !w-auto !py-2 text-xs">
          <option value="all">{t.tags}</option>
          {tags.map((item) => <option key={item} value={item}>#{item}</option>)}
        </select>
        <span className="pill ml-1">{storyCountLabel(entries.length, locale)}</span>
      </div>
    </div>
    {entries.length === 0
      ? <StoryEmptyState locale={locale} view={view} t={t} />
      : filtered.length === 0
        ? <div className="card mt-8 p-10 text-center"><h2 className="display text-2xl">{t.noMatches}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">{t.noMatchesBody}</p></div>
        : view === "timeline"
          ? <div className="timeline">{filtered.map((entry) => <article key={entry.id} className="timeline-item"><span className="timeline-dot" style={{ background: entryTone(entry.changeDirection) }} /><div className="card p-5"><div className="flex justify-between gap-4"><div><p className="eyebrow !text-[.66rem]">{formatStoryDate(entry.startDate, entry.datePrecision, locale)}</p><h2 className="display mt-2 flex flex-wrap items-center gap-2 text-2xl">{entry.title}<EntryFieldOriginBadge entry={entry} field="title" locale={locale} /></h2>{entry.momentFlags.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{entry.momentFlags.map((flag) => <span key={flag} className="rounded-full bg-[#fff0e5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#8a5a3d]">{momentFlagLabel(flag, locale)}</span>)}</div>}</div><div className="flex items-start"><Link href={`/${locale}/app/entries/${entry.id}/edit`} className="btn btn-quiet !p-2 text-xs">{t.edit}</Link><DeleteEntryButton entryId={entry.id} locale={locale} /></div></div>{entry.narrative && <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{entry.narrative}</p>}{entry.narrative && <div className="mt-2"><EntryFieldOriginBadge entry={entry} field="narrative" locale={locale} /></div>}<div className="mt-4 flex flex-wrap gap-2"><span className="pill" style={{ color: entryTone(entry.changeDirection), background: `${entryTone(entry.changeDirection)}18` }}>{titleCase(entry.changeDirection)}</span>{entry.tags.map((item) => <span className="pill" key={item}>#{item}</span>)}</div>{entry.learning && <div className="mt-4 rounded-xl bg-[#f1f6ee] p-3 text-sm"><span className="mb-1 flex flex-wrap items-center gap-2"><span className="font-bold text-[var(--moss-deep)]">{locale === "es" ? "Aprendizaje" : "Lesson"}</span><EntryFieldOriginBadge entry={entry} field="learning" locale={locale} /></span><p className="mt-1">{entry.learning}</p></div>}</div></article>)}</div>
          : view === "areas"
            ? <StoryAreaBoard entries={filtered} locale={locale} />
            : <StoryThreadsView entries={filtered} links={links} locale={locale} />}
    {entries.length > 0 && <Link href={`/${locale}/app/reflect`} className="card mt-8 flex items-center justify-between gap-4 p-5 transition hover:border-[#b9d0b8]"><span><span className="eyebrow">{locale === "es" ? "Herramienta complementaria" : "Companion tool"}</span><strong className="display mt-1 block text-xl">{t.reflect}</strong></span><span className="btn btn-secondary !p-3"><Sparkles size={17} /></span></Link>}
  </div>;
}
