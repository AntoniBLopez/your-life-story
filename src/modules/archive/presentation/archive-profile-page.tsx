"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, CalendarDays, GitBranch, Mountain, UsersRound } from "lucide-react";
import { StoryLifeTree } from "@/modules/life-story/presentation/components/story-life-tree";
import { VoiceAttachmentsList } from "@/modules/life-story/presentation/components/voice-attachments-list";
import { entryTone, LIFE_AREAS, momentFlagLabel, type LifeEntry, type LifeEntryLink } from "@/modules/life-story/domain/life-entry";
import type { FamilyPerson, FamilyRelationship } from "@/modules/family-tree/domain/family-graph";
import type { AttachmentRecord } from "@/shared/lib/mongodb/attachments";
import { formatStoryDate, titleCase } from "@/shared/lib/utils";
import { AUDIO_CONTENT_TYPES } from "@/modules/life-story/domain/voice-note";
import { ArchiveAiChat } from "./archive-ai-chat";
import { PublicSiteFooter, PublicSiteHeader } from "./public-site-chrome";

type Props = {
  locale: "es" | "en";
  slug: string;
  displayName: string;
  deceasedAt: string | null;
  publishedAt: string;
  entries: LifeEntry[];
  links: LifeEntryLink[];
  people: FamilyPerson[];
  relationships: FamilyRelationship[];
  attachments: AttachmentRecord[];
};

function copy(locale: "es" | "en") {
  return locale === "es"
    ? {
        deceased: "Fallecida",
        published: "Publicada en vida",
        archive: "Archivo de vidas",
        back: "Todas las vidas",
        intro: "Un testimonio publicado para estudiarlo: cómo pensaba, qué decidió, qué aprendió, cuáles fueron sus momentos críticos y cómo los superó.",
        timeline: "Línea temporal",
        tree: "Árbol de vida",
        family: "Familia",
        empty: "Esta vida se publicó sin experiencias escritas todavía.",
        learning: "Aprendizaje",
        difficulty: "Dificultad",
        transformation: "Transformación",
        files: "Archivos",
        moments: "Momentos",
        lessons: "Aprendizajes",
        critical: "Momentos críticos",
        familyCount: "Familia",
        highlightLesson: "Aprendizaje",
        highlightMoment: "Momento clave",
      }
    : {
        deceased: "Deceased",
        published: "Published in life",
        archive: "Life archive",
        back: "All lives",
        intro: "A published testimony to study: how they thought, what they decided, what they learnt, which moments were critical and how they overcame them.",
        timeline: "Timeline",
        tree: "Life tree",
        family: "Family",
        empty: "This life was published without written experiences yet.",
        learning: "Lesson",
        difficulty: "Difficulty",
        transformation: "Transformation",
        files: "Files",
        moments: "Moments",
        lessons: "Lessons",
        critical: "Critical moments",
        familyCount: "Family",
        highlightLesson: "Lesson",
        highlightMoment: "Turning point",
      };
}

export function ArchiveProfilePage({ locale, slug, displayName, deceasedAt, publishedAt, entries, links, people, relationships, attachments }: Props) {
  const [view, setView] = useState<"timeline" | "tree" | "family">("timeline");
  const attachmentsByEntry = useMemo(() => {
    const map = new Map<string, AttachmentRecord[]>();
    for (const attachment of attachments) {
      const list = map.get(attachment.entryId) ?? [];
      list.push(attachment);
      map.set(attachment.entryId, list);
    }
    return map;
  }, [attachments]);
  const years = entries.map((entry) => entry.startDate.slice(0, 4)).filter(Boolean);
  const t = copy(locale);
  const lessonCount = entries.filter((entry) => entry.learning?.trim()).length;
  const criticalCount = entries.filter((entry) => entry.momentFlags.length > 0 || entry.difficulty?.trim()).length;
  const highlights: Array<{ kind: "lesson" | "moment"; text: string }> = [];
  for (const entry of entries) {
    if (highlights.length >= 2) break;
    if (entry.learning?.trim()) highlights.push({ kind: "lesson", text: entry.learning.trim() });
    else if (entry.momentFlags.length > 0) highlights.push({ kind: "moment", text: entry.title });
    else if (entry.transformation?.trim()) highlights.push({ kind: "moment", text: entry.transformation.trim() });
  }
  const span = years[0]
    ? `${years[0]}${years.at(-1) && years.at(-1) !== years[0] ? ` – ${years.at(-1)}` : ""}`
    : String(new Date(publishedAt).getFullYear());

  return (
    <main className="page-shell overflow-hidden">
      <PublicSiteHeader locale={locale} current="archive" />
      <article className="container relative pb-20 pt-8 sm:pt-12">
        <div className="pointer-events-none absolute right-8 top-4 h-40 w-40 rounded-full bg-[var(--sage)] blur-3xl" />
        <div className="pointer-events-none absolute left-4 top-24 h-28 w-28 rounded-full bg-[var(--peach)]/50 blur-3xl" />
        <Link className="relative inline-flex items-center gap-2 text-sm font-bold text-[var(--moss-deep)]" href={`/${locale}/archive` as Route}>
          <ArrowLeft size={15} />
          {t.back}
        </Link>
        <p className="eyebrow relative mt-6">{t.archive}</p>
        <div className="relative mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="display text-4xl sm:text-6xl">{displayName}</h1>
            <p className="mt-3 text-sm font-semibold text-[var(--moss-deep)]">{span}</p>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">{t.intro}</p>
          </div>
          <span className={`pill ${deceasedAt ? "!bg-[#fff0e5] !text-[#8a5a3d]" : ""}`}>{deceasedAt ? t.deceased : t.published}</span>
        </div>
        <div className="relative mt-8 grid gap-3 sm:grid-cols-4">
          {[
            { label: t.moments, value: entries.length },
            { label: t.lessons, value: lessonCount },
            { label: t.critical, value: criticalCount },
            { label: t.familyCount, value: people.length },
          ].map((stat) => (
            <div key={stat.label} className="card px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--moss)]">{stat.label}</p>
              <p className="display mt-1 text-2xl">{stat.value}</p>
            </div>
          ))}
        </div>
        {highlights.length > 0 && (
          <div className="relative mt-4 grid gap-3 sm:grid-cols-2">
            {highlights.map((item) => (
              <blockquote key={`${item.kind}-${item.text}`} className="card p-5" style={{ background: item.kind === "lesson" ? "#edf5ec" : "#fff4ec" }}>
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--moss)]">
                  {item.kind === "lesson" ? t.highlightLesson : t.highlightMoment}
                </p>
                <p className="display mt-2 text-lg leading-snug">{item.text}</p>
              </blockquote>
            ))}
          </div>
        )}
        <div className="relative mt-8 flex gap-1 rounded-xl bg-[#eef2ec] p-1 w-fit">
          <button onClick={() => setView("timeline")} className={`btn !rounded-lg !px-3 !py-2 ${view === "timeline" ? "!bg-white !text-[var(--moss-deep)] shadow-sm" : "btn-quiet"}`}><CalendarDays size={15} />{t.timeline}</button>
          <button onClick={() => setView("tree")} className={`btn !rounded-lg !px-3 !py-2 ${view === "tree" ? "!bg-white !text-[var(--moss-deep)] shadow-sm" : "btn-quiet"}`}><GitBranch size={15} />{t.tree}</button>
          <button onClick={() => setView("family")} className={`btn !rounded-lg !px-3 !py-2 ${view === "family" ? "!bg-white !text-[var(--moss-deep)] shadow-sm" : "btn-quiet"}`}><UsersRound size={15} />{t.family}</button>
        </div>
        {entries.length === 0 && view !== "family" ? (
          <div className="card mt-8 p-8 text-center"><p className="text-sm text-[var(--muted)]">{t.empty}</p></div>
        ) : view === "timeline" ? (
          <div className="timeline mt-2">
            {entries.map((entry) => {
              const files = attachmentsByEntry.get(entry.id) ?? [];
              const images = files.filter((file) => file.mimeType.startsWith("image/"));
              const docs = files.filter((file) => file.mimeType === "application/pdf");
              return (
                <article key={entry.id} className="timeline-item">
                  <span className="timeline-dot" style={{ background: entryTone(entry.changeDirection) }} />
                  <div className="card p-5">
                    <p className="eyebrow !text-[.66rem]">{formatStoryDate(entry.startDate, entry.datePrecision, locale)}{entry.endDate ? ` → ${formatStoryDate(entry.endDate, entry.datePrecision, locale)}` : ""}</p>
                    <h2 className="display mt-2 text-2xl">{entry.title}</h2>
                    {entry.momentFlags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {entry.momentFlags.map((flag) => (
                          <span key={flag} className="inline-flex items-center gap-1 rounded-full bg-[#fff0e5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#8a5a3d]">
                            <Mountain size={10} />
                            {momentFlagLabel(flag, locale)}
                          </span>
                        ))}
                      </div>
                    )}
                    {entry.narrative && <p className="mt-3 text-sm leading-6 text-[var(--muted)] whitespace-pre-wrap">{entry.narrative}</p>}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="pill" style={{ color: entryTone(entry.changeDirection), background: `${entryTone(entry.changeDirection)}18` }}>{titleCase(entry.changeDirection)}</span>
                      {(entry.lifeAreas ?? [entry.lifeArea]).map((area) => <span className="pill" key={area}>{LIFE_AREAS.includes(area) ? titleCase(area) : area}</span>)}
                      {entry.tags.map((item) => <span className="pill" key={item}>#{item}</span>)}
                    </div>
                    {entry.difficulty && <div className="mt-4 rounded-xl bg-[#fff6f1] p-3 text-sm"><span className="font-bold text-[#8a5a3d]">{t.difficulty}: </span>{entry.difficulty}</div>}
                    {entry.learning && <div className="mt-3 rounded-xl bg-[#f1f6ee] p-3 text-sm"><span className="font-bold text-[var(--moss-deep)]">{t.learning}: </span>{entry.learning}</div>}
                    {entry.transformation && <div className="mt-3 rounded-xl bg-[#edf3eb] p-3 text-sm"><span className="font-bold text-[var(--moss-deep)]">{t.transformation}: </span>{entry.transformation}</div>}
                    {files.length > 0 && (
                      <div className="mt-4 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{t.files}</p>
                        {images.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{images.map((file) => <a key={file.id} href={`/api/attachments/${file.id}`} target="_blank" rel="noreferrer"><img src={`/api/attachments/${file.id}`} alt={file.fileName} className="h-40 w-full rounded-xl object-cover" /></a>)}</div>}
                        {docs.map((file) => <a key={file.id} className="block text-sm font-bold text-[var(--moss)] underline" href={`/api/attachments/${file.id}`} target="_blank" rel="noreferrer">{file.fileName}</a>)}
                        <VoiceAttachmentsList locale={locale} readOnly attachments={files.filter((file) => AUDIO_CONTENT_TYPES.includes(file.mimeType as (typeof AUDIO_CONTENT_TYPES)[number]))} />
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : view === "tree" ? (
          <StoryLifeTree entries={entries} links={links} locale={locale} readOnly />
        ) : (
          <section className="mt-8 grid gap-4 sm:grid-cols-2">
            {people.length === 0 ? <div className="card p-8 text-center sm:col-span-2"><p className="text-sm text-[var(--muted)]">{locale === "es" ? "No hay árbol familiar publicado." : "No family tree was published."}</p></div> : people.map((person) => (
              <article key={person.id} className="card p-5">
                <h3 className="display text-xl">{person.fullName}</h3>
                {person.isSubject && <span className="pill mt-2">{locale === "es" ? "Protagonista" : "Subject"}</span>}
                <p className="mt-3 text-sm text-[var(--muted)]">{[person.birthDate, person.deathDate].filter(Boolean).join(" – ") || "—"}</p>
                {(person.birthCity || person.birthCountry) && <p className="mt-1 text-sm text-[var(--muted)]">{[person.birthCity, person.birthCountry].filter(Boolean).join(", ")}</p>}
                {person.notes && <p className="mt-3 text-sm leading-6">{person.notes}</p>}
              </article>
            ))}
            {relationships.length > 0 && <p className="sm:col-span-2 text-xs text-[var(--muted)]">{relationships.length} {locale === "es" ? "vínculos familiares registrados." : "recorded family ties."}</p>}
          </section>
        )}
        <ArchiveAiChat locale={locale} slug={slug} displayName={displayName} />
      </article>
      <PublicSiteFooter locale={locale} />
    </main>
  );
}
