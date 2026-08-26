"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, Filter, GitBranch, Plus, Sparkles } from "lucide-react";
import { type LifeEntry, type LifeEntryLink, entryTone, LIFE_AREAS, momentFlagLabel } from "@/modules/life-story/domain/life-entry";
import { formatStoryDate, titleCase } from "@/shared/lib/utils";
import { DeleteEntryButton } from "./delete-entry-button";
import { StoryLifeTree } from "./story-life-tree";

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
  view: "timeline" | "tree";
  t: { empty: string; emptyBody: string; example: string; exampleTree: string; add: string };
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
          {view === "timeline" ? t.example : t.exampleTree}
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
        ) : (
          <div className="placeholder-preview tree-canvas mt-4" aria-hidden="true">
            <div className="tree-lane">
              {examples.map((entry) => (
                <div key={entry.title} className="tree-node" style={{ borderColor: `${entryTone(entry.direction)}80` }}>
                  <span className="placeholder-badge mb-2">{locale === "es" ? "Ejemplo" : "Example"}</span>
                  <span className="text-xs font-bold text-[var(--muted)]">{formatStoryDate(entry.date, entry.precision, locale)}</span>
                  <strong className="display mt-2 block text-lg">{entry.title}</strong>
                  <span className="mt-2 block text-xs text-[var(--moss)]">{titleCase(entry.area)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function StoryDashboard({ entries, links, locale, displayName }: { entries: LifeEntry[]; links: LifeEntryLink[]; locale: "es" | "en"; displayName?: string }) {
  const [view, setView] = useState<"timeline" | "tree">("timeline");
  const [area, setArea] = useState("all");
  const [tag, setTag] = useState("all");
  const tags = useMemo(() => Array.from(new Set(entries.flatMap((entry) => entry.tags))).sort(), [entries]);
  const filtered = entries.filter((entry) => (area === "all" || (entry.lifeAreas ?? [entry.lifeArea]).includes(area as LifeEntry["lifeArea"])) && (tag === "all" || entry.tags.includes(tag)));
  const t = locale === "es"
    ? { welcome: "Tu historia,", heading: "vista con perspectiva.", timeline: "Línea temporal", tree: "Árbol de vida", add: "Añadir experiencia", all: "Todas las áreas", tags: "Todas las etiquetas", empty: "Aún no has añadido momentos.", emptyBody: "Empieza por una fecha, una situación o un aprendizaje que quieras recordar.", example: "Así podría verse tu línea temporal", exampleTree: "Así podría verse tu árbol de vida", noMatches: "Ningún momento coincide con estos filtros.", noMatchesBody: "Prueba con otra área o etiqueta.", edit: "Editar", reflect: "¿Te apetece mirar esto con más perspectiva?" }
    : { welcome: "Your story,", heading: "seen in perspective.", timeline: "Timeline", tree: "Life tree", add: "Add experience", all: "All areas", tags: "All tags", empty: "You have not added any moments yet.", emptyBody: "Start with a date, situation or lesson you want to remember.", example: "This is how your timeline could look", exampleTree: "This is how your life tree could look", noMatches: "No moments match these filters.", noMatchesBody: "Try another area or tag.", edit: "Edit", reflect: "Want to look at this with more perspective?" };

  return <div className="fade-in">
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow">{t.welcome} {displayName ?? ""}</p><h1 className="display mt-2 text-4xl sm:text-5xl">{t.heading}</h1></div><Link className="btn btn-primary" href={`/${locale}/app/entries/new`}><Plus size={16} />{t.add}</Link></div>
    <div className="mt-8 flex flex-col justify-between gap-4 border-b border-[var(--line)] pb-4 lg:flex-row lg:items-center"><div className="flex gap-1 rounded-xl bg-[#eef2ec] p-1"><button onClick={() => setView("timeline")} className={`btn !rounded-lg !px-3 !py-2 ${view === "timeline" ? "!bg-white !text-[var(--moss-deep)] shadow-sm" : "btn-quiet"}`}><CalendarDays size={15} />{t.timeline}</button><button onClick={() => setView("tree")} className={`btn !rounded-lg !px-3 !py-2 ${view === "tree" ? "!bg-white !text-[var(--moss-deep)] shadow-sm" : "btn-quiet"}`}><GitBranch size={15} />{t.tree}</button></div><div className="flex flex-wrap gap-2"><Filter size={15} className="mt-2 text-[var(--muted)]" /><select aria-label="Area filter" value={area} onChange={(event) => setArea(event.target.value)} className="select !w-auto !py-2 text-xs"><option value="all">{t.all}</option>{LIFE_AREAS.map((value) => <option key={value} value={value}>{value === "general" ? (locale === "es" ? "En general" : "General") : titleCase(value)}</option>)}</select><select aria-label="Tag filter" value={tag} onChange={(event) => setTag(event.target.value)} className="select !w-auto !py-2 text-xs"><option value="all">{t.tags}</option>{tags.map((item) => <option key={item} value={item}>#{item}</option>)}</select></div></div>
    {entries.length === 0
      ? <StoryEmptyState locale={locale} view={view} t={t} />
      : filtered.length === 0
        ? <div className="card mt-8 p-10 text-center"><h2 className="display text-2xl">{t.noMatches}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">{t.noMatchesBody}</p></div>
        : view === "timeline"
          ? <div className="timeline">{filtered.map((entry) => <article key={entry.id} className="timeline-item"><span className="timeline-dot" style={{ background: entryTone(entry.changeDirection) }} /><div className="card p-5"><div className="flex justify-between gap-4"><div><p className="eyebrow !text-[.66rem]">{formatStoryDate(entry.startDate, entry.datePrecision, locale)}</p><h2 className="display mt-2 text-2xl">{entry.title}</h2>{entry.momentFlags.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{entry.momentFlags.map((flag) => <span key={flag} className="rounded-full bg-[#fff0e5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#8a5a3d]">{momentFlagLabel(flag, locale)}</span>)}</div>}</div><div className="flex items-start"><Link href={`/${locale}/app/entries/${entry.id}/edit`} className="btn btn-quiet !p-2 text-xs">{t.edit}</Link><DeleteEntryButton entryId={entry.id} locale={locale} /></div></div>{entry.narrative && <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{entry.narrative}</p>}<div className="mt-4 flex flex-wrap gap-2"><span className="pill" style={{ color: entryTone(entry.changeDirection), background: `${entryTone(entry.changeDirection)}18` }}>{titleCase(entry.changeDirection)}</span>{entry.tags.map((item) => <span className="pill" key={item}>#{item}</span>)}</div>{entry.learning && <div className="mt-4 rounded-xl bg-[#f1f6ee] p-3 text-sm"><span className="font-bold text-[var(--moss-deep)]">{locale === "es" ? "Aprendizaje: " : "Lesson: "}</span>{entry.learning}</div>}</div></article>)}</div>
          : <StoryLifeTree entries={filtered} links={links} locale={locale} />}
    {entries.length > 0 && <Link href={`/${locale}/app/reflect`} className="card mt-8 flex items-center justify-between gap-4 p-5 transition hover:border-[#b9d0b8]"><span><span className="eyebrow">{locale === "es" ? "Herramienta complementaria" : "Companion tool"}</span><strong className="display mt-1 block text-xl">{t.reflect}</strong></span><span className="btn btn-secondary !p-3"><Sparkles size={17} /></span></Link>}
  </div>;
}
