"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Copy, Download, GitBranch, LoaderCircle, UsersRound } from "lucide-react";
import { duplicateSharedTimelineAction } from "@/modules/family-tree/application/family-actions";
import type { SharedTimeline } from "@/modules/family-tree/application/timeline-share-service";
import { FamilyTreePage } from "@/modules/family-tree/presentation/components/family-tree-page";
import { StoryLifeTree } from "@/modules/life-story/presentation/components/story-life-tree";
import { entryTone, LIFE_AREAS, momentFlagLabel } from "@/modules/life-story/domain/life-entry";
import { formatStoryDate, titleCase } from "@/shared/lib/utils";

export function SharedTimelinePage({ locale, shared }: { locale: "es" | "en"; shared: SharedTimeline }) {
  const router = useRouter();
  const [view, setView] = useState<"timeline" | "tree" | "family">("timeline");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const t = locale === "es"
    ? {
        back: "Mi historia",
        eyebrow: "Solo lectura",
        title: `El cronograma de ${shared.ownerDisplayName}`,
        intro: `Formas parte de su árbol familiar${shared.relationLabel ? ` como ${shared.relationLabel.toLowerCase()}` : ""} (${shared.personName}). Te dio permiso para leer su historia. No puedes editarla; sí puedes copiarla a tu cronograma o extraer el árbol en GEDCOM.`,
        timeline: "Línea temporal",
        tree: "Árbol de vida",
        family: "Árbol familiar",
        empty: "Esta persona aún no ha escrito momentos.",
        copy: "Duplicar en mi cronograma",
        copied: "Se ha copiado a tu historia.",
        confirm: `Se copiarán ${shared.entries.length} momentos a tu cronograma. Los archivos adjuntos no se copian. ¿Continuar?`,
        export: "Exportar GEDCOM",
        learning: "Aprendizaje",
        difficulty: "Dificultad",
        transformation: "Transformación",
      }
    : {
        back: "My story",
        eyebrow: "Read only",
        title: `${shared.ownerDisplayName}’s timeline`,
        intro: `You are part of their family tree${shared.relationLabel ? ` as ${shared.relationLabel.toLowerCase()}` : ""} (${shared.personName}). They gave you permission to read their story. You cannot edit it; you can copy it into your timeline or export the tree as GEDCOM.`,
        timeline: "Timeline",
        tree: "Life tree",
        family: "Family tree",
        empty: "This person has not written any moments yet.",
        copy: "Duplicate into my timeline",
        copied: "It has been copied to your story.",
        confirm: `${shared.entries.length} moments will be copied into your timeline. Attachments are not copied. Continue?`,
        export: "Export GEDCOM",
        learning: "Lesson",
        difficulty: "Difficulty",
        transformation: "Transformation",
      };

  function duplicate() {
    if (!window.confirm(t.confirm)) return;
    setError(undefined);
    startTransition(async () => {
      const result = await duplicateSharedTimelineAction(shared.ownerUserId, locale);
      if (!result.ok) setError(result.error);
      else {
        setCopied(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="fade-in">
      <Link className="inline-flex items-center gap-2 text-sm font-bold text-[var(--moss-deep)]" href={`/${locale}/app`}>
        <ArrowLeft size={15} />
        {t.back}
      </Link>
      <p className="eyebrow mt-6">{t.eyebrow}</p>
      <div className="mt-3 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <h1 className="display text-4xl sm:text-5xl">{t.title}</h1>
          <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{t.intro}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button disabled={pending || copied} className="btn btn-primary" onClick={duplicate}>
            {pending ? <LoaderCircle className="animate-spin" size={16} /> : <Copy size={16} />}
            {copied ? t.copied : t.copy}
          </button>
          <a className="btn btn-secondary" href={`/${locale}/api/family/shared/${shared.ownerUserId}/gedcom`}>
            <Download size={16} />
            {t.export}
          </a>
        </div>
      </div>
      {error && <p className="field-error mt-4">{error}</p>}
      <div className="mt-8 flex gap-1 rounded-xl bg-[#eef2ec] p-1 w-fit">
        <button onClick={() => setView("timeline")} className={`btn !rounded-lg !px-3 !py-2 ${view === "timeline" ? "!bg-white !text-[var(--moss-deep)] shadow-sm" : "btn-quiet"}`}><CalendarDays size={15} />{t.timeline}</button>
        <button onClick={() => setView("tree")} className={`btn !rounded-lg !px-3 !py-2 ${view === "tree" ? "!bg-white !text-[var(--moss-deep)] shadow-sm" : "btn-quiet"}`}><GitBranch size={15} />{t.tree}</button>
        <button onClick={() => setView("family")} className={`btn !rounded-lg !px-3 !py-2 ${view === "family" ? "!bg-white !text-[var(--moss-deep)] shadow-sm" : "btn-quiet"}`}><UsersRound size={15} />{t.family}</button>
      </div>
      {view === "family" ? (
        <FamilyTreePage locale={locale} people={shared.people} relationships={shared.relationships} readOnly embedded youPersonId={shared.personId} />
      ) : shared.entries.length === 0 ? (
        <div className="card mt-8 p-8 text-center"><p className="text-sm text-[var(--muted)]">{t.empty}</p></div>
      ) : view === "tree" ? (
        <StoryLifeTree entries={shared.entries} links={shared.links} locale={locale} readOnly />
      ) : (
        <div className="timeline mt-2">
          {shared.entries.map((entry) => (
            <article key={entry.id} className="timeline-item">
              <span className="timeline-dot" style={{ background: entryTone(entry.changeDirection) }} />
              <div className="card p-5">
                <p className="eyebrow !text-[.66rem]">{formatStoryDate(entry.startDate, entry.datePrecision, locale)}{entry.endDate ? ` → ${formatStoryDate(entry.endDate, entry.datePrecision, locale)}` : ""}</p>
                <h2 className="display mt-2 text-2xl">{entry.title}</h2>
                {entry.momentFlags.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{entry.momentFlags.map((flag) => <span key={flag} className="rounded-full bg-[#fff0e5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#8a5a3d]">{momentFlagLabel(flag, locale)}</span>)}</div>}
                {entry.narrative && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">{entry.narrative}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="pill" style={{ color: entryTone(entry.changeDirection), background: `${entryTone(entry.changeDirection)}18` }}>{titleCase(entry.changeDirection)}</span>
                  {(entry.lifeAreas ?? [entry.lifeArea]).map((area) => <span className="pill" key={area}>{LIFE_AREAS.includes(area) ? titleCase(area) : area}</span>)}
                  {entry.tags.map((item) => <span className="pill" key={item}>#{item}</span>)}
                </div>
                {entry.difficulty && <div className="mt-4 rounded-xl bg-[#fff6f1] p-3 text-sm"><span className="font-bold text-[#8a5a3d]">{t.difficulty}: </span>{entry.difficulty}</div>}
                {entry.learning && <div className="mt-3 rounded-xl bg-[#f1f6ee] p-3 text-sm"><span className="font-bold text-[var(--moss-deep)]">{t.learning}: </span>{entry.learning}</div>}
                {entry.transformation && <div className="mt-3 rounded-xl bg-[#edf3eb] p-3 text-sm"><span className="font-bold text-[var(--moss-deep)]">{t.transformation}: </span>{entry.transformation}</div>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
