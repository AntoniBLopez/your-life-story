"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, ChevronDown, Landmark, LoaderCircle, Search, Send, Sparkles } from "lucide-react";
import type { PublicLifeSummary } from "@/modules/archive/domain/archive";
import { submitPublicPublicationRequestAction } from "@/modules/archive/application/archive-actions";
import { PublicSiteFooter, PublicSiteHeader } from "./public-site-chrome";

function copy(locale: "es" | "en") {
  return locale === "es"
    ? {
        title: "Archivo de vidas",
        intro: "Testimonios publicados con permiso de quienes los escribieron. Lee cómo pensaban, qué decidieron y cómo atravesaron sus momentos difíciles.",
        aiHint: "Dentro de cada testimonio puedes preguntar a la IA, que responde sólo con lo que esa persona dejó escrito.",
        search: "Buscar por nombre, año o palabra",
        filterAll: "Todas",
        filterLiving: "En vida",
        filterDeceased: "Fallecidas",
        count: (n: number) => (n === 1 ? "1 testimonio" : `${n} testimonios`),
        empty: "Aún no hay vidas publicadas.",
        emptyBody: "Cuando alguien dé permiso para publicar su historia, o cuando confirmemos un fallecimiento de quien ya lo había concedido, aparecerá aquí.",
        noMatches: "Ningún testimonio coincide con esa búsqueda.",
        clearSearch: "Limpiar búsqueda",
        deceased: "Fallecida",
        living: "Publicada en vida",
        moments: "momentos",
        lesson: "Aprendizaje",
        turning: "Momento clave",
        read: "Leer esta vida",
        requestTitle: "¿Falta la historia de alguien?",
        requestBody: "Si una persona ha fallecido, envía una petición. Un administrador la revisará y su vida sólo se publicará si, en vida, dio permiso en sus ajustes para hacerla pública.",
        requestOpen: "Solicitar la publicación de una vida",
        name: "Tu nombre",
        email: "Tu email",
        target: "Email de la persona",
        relation: "Tu relación con ella",
        relationPlaceholder: "Hija, amigo, historiador…",
        death: "Fecha de fallecimiento",
        message: "Por qué debería publicarse",
        send: "Enviar petición",
        sent: "Hemos recibido tu petición. Un administrador la revisará.",
      }
    : {
        title: "Life archive",
        intro: "Testimonies published with the permission of those who wrote them. Read how they thought, what they decided and how they got through their hardest moments.",
        aiHint: "Inside each testimony you can ask the AI, which answers only from what that person left in writing.",
        search: "Search by name, year or word",
        filterAll: "All",
        filterLiving: "In life",
        filterDeceased: "Deceased",
        count: (n: number) => (n === 1 ? "1 testimony" : `${n} testimonies`),
        empty: "No lives have been published yet.",
        emptyBody: "When someone gives permission to publish their story, or when we confirm the death of someone who already had, it will appear here.",
        noMatches: "No testimony matches that search.",
        clearSearch: "Clear search",
        deceased: "Deceased",
        living: "Published in life",
        moments: "moments",
        lesson: "Lesson",
        turning: "Turning point",
        read: "Read this life",
        requestTitle: "Is someone's story missing?",
        requestBody: "If someone has died, send a request. An administrator will review it, and their life will only be published if, while alive, they gave permission in their settings to make it public.",
        requestOpen: "Request the publication of a life",
        name: "Your name",
        email: "Your email",
        target: "Person's email",
        relation: "Your relationship to them",
        relationPlaceholder: "Daughter, friend, historian…",
        death: "Date of death",
        message: "Why it should be published",
        send: "Send request",
        sent: "We have received your request. An administrator will review it.",
      };
}

type StatusFilter = "all" | "living" | "deceased";

export function ArchiveIndexPage({ locale, lives, authenticated = false, email }: { locale: "es" | "en"; lives: PublicLifeSummary[]; authenticated?: boolean; email?: string | null }) {
  const t = copy(locale);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return lives.filter((life) => {
      if (status === "living" && life.deceased) return false;
      if (status === "deceased" && !life.deceased) return false;
      if (!needle) return true;
      return [life.displayName, life.firstYear, life.lastYear, life.highlight].some((value) => value?.toLocaleLowerCase().includes(needle));
    });
  }, [lives, query, status]);

  const hasFilters = query.trim() !== "" || status !== "all";

  function submit(formData: FormData) {
    setError(undefined);
    formData.set("locale", locale);
    startTransition(async () => {
      const result = await submitPublicPublicationRequestAction(formData);
      if (!result.ok) setError(result.error);
      else setSent(true);
    });
  }

  const filters: { value: StatusFilter; label: string }[] = [
    { value: "all", label: t.filterAll },
    { value: "living", label: t.filterLiving },
    { value: "deceased", label: t.filterDeceased },
  ];

  return (
    <main className="page-shell">
      <PublicSiteHeader locale={locale} current="archive" authenticated={authenticated} email={email} />

      <section className="container fade-in pb-8 pt-8 sm:pt-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="display text-3xl text-[var(--ink)] sm:text-4xl">{t.title}</h1>
          <p className="mt-3 text-base leading-7 text-[var(--muted)]">{t.intro}</p>
          <p className="mt-2 inline-flex items-start gap-1.5 text-sm leading-6 text-[var(--muted)]">
            <Sparkles size={14} className="mt-1 shrink-0 text-[var(--moss)]" />
            {t.aiHint}
          </p>
        </div>
        <div className="mx-auto mt-7 max-w-xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={17} />
            <input
              type="search"
              className="input !rounded-full !py-3.5 !pl-11 !pr-4 shadow-[0_10px_30px_#26332b0a]"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.search}
              aria-label={t.search}
            />
          </div>
          {lives.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatus(filter.value)}
                  aria-pressed={status === filter.value}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                    status === filter.value
                      ? "border-[var(--moss)] bg-[#edf3eb] text-[var(--moss-deep)]"
                      : "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:border-[#b9d0b8] hover:text-[var(--moss-deep)]"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
              <span className="ml-1 text-xs font-semibold text-[var(--muted)]">{t.count(filtered.length)}</span>
            </div>
          )}
        </div>
      </section>

      <section className="container pb-16">
        {filtered.length === 0 ? (
          <div className="mx-auto max-w-md py-14 text-center">
            <Landmark className="mx-auto text-[var(--moss)]" size={26} />
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{lives.length === 0 ? `${t.empty} ${t.emptyBody}` : t.noMatches}</p>
            {lives.length > 0 && hasFilters && (
              <button
                type="button"
                className="btn btn-secondary mt-5"
                onClick={() => {
                  setQuery("");
                  setStatus("all");
                }}
              >
                {t.clearSearch}
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((life) => (
              <Link
                key={life.slug}
                href={`/${locale}/archive/${life.slug}` as Route}
                className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-[#b9d0b8] sm:p-6"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="display text-xl leading-snug">{life.displayName}</h2>
                  <span className={`pill shrink-0 ${life.deceased ? "!bg-[#f4ece3] !text-[#8a5a3d]" : ""}`}>{life.deceased ? t.deceased : t.living}</span>
                </div>
                <p className="mt-1.5 text-sm text-[var(--muted)]">
                  {[life.firstYear, life.lastYear].filter(Boolean).join(" – ") || "—"}
                  {" · "}
                  {life.entryCount} {t.moments}
                </p>
                {life.highlight && (
                  <blockquote className="mt-4 border-l-2 border-[var(--sage)] pl-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--moss)]">{life.highlightKind === "lesson" ? t.lesson : t.turning}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--ink)]">{life.highlight}</p>
                  </blockquote>
                )}
                <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-bold text-[var(--moss-deep)]">
                  {t.read}
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="container pb-16">
        <details className="card group mx-auto max-w-2xl overflow-hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 marker:hidden sm:p-6 [&::-webkit-details-marker]:hidden">
            <div>
              <h2 className="display text-lg">{t.requestTitle}</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{t.requestBody}</p>
            </div>
            <ChevronDown size={18} className="shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-[var(--line)] p-5 sm:p-6">
            {sent ? (
              <p className="rounded-xl bg-[#edf3eb] p-4 text-sm text-[var(--moss-deep)]">{t.sent}</p>
            ) : (
              <form action={submit} className="grid gap-4 sm:grid-cols-2">
                <label><span className="field-label">{t.name}</span><input className="input" name="requesterName" required minLength={2} /></label>
                <label><span className="field-label">{t.email}</span><input className="input" name="requesterEmail" type="email" required /></label>
                <label><span className="field-label">{t.target}</span><input className="input" name="targetEmail" type="email" required /></label>
                <label><span className="field-label">{t.relation}</span><input className="input" name="relationship" required minLength={2} placeholder={t.relationPlaceholder} /></label>
                <label><span className="field-label">{t.death}</span><input className="input" name="deathDate" type="date" /></label>
                <label className="sm:col-span-2"><span className="field-label">{t.message}</span><textarea className="textarea !min-h-24" name="message" required minLength={10} /></label>
                {error && <p className="field-error sm:col-span-2">{error}</p>}
                <button disabled={pending} className="btn btn-primary w-full sm:col-span-2 sm:w-fit">
                  {pending ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}
                  {t.send}
                </button>
              </form>
            )}
          </div>
        </details>
      </section>

      <PublicSiteFooter locale={locale} authenticated={authenticated} />
    </main>
  );
}
