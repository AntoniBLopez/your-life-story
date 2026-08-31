"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Landmark, LoaderCircle, Search, Send } from "lucide-react";
import type { PublicLifeSummary } from "@/modules/archive/domain/archive";
import { submitPublicPublicationRequestAction } from "@/modules/archive/application/archive-actions";
import { PublicSiteFooter, PublicSiteHeader } from "./public-site-chrome";

function copy(locale: "es" | "en") {
  return locale === "es"
    ? {
        eyebrow: "Archivo histórico",
        title: "Vidas publicadas para ser leídas y estudiadas.",
        intro: "Un archivo público de testimonios. Aquí puedes conocer cómo pensaba alguien, qué decidió y qué aprendió. Pregunta a la IA sobre cualquier vida publicada.",
        search: "Buscar una vida",
        empty: "Aún no hay vidas publicadas.",
        emptyBody: "Cuando alguien elija publicar su historia, o cuando se acepte un fallecimiento, aparecerá aquí.",
        deceased: "Fallecida",
        living: "Publicada en vida",
        moments: "momentos",
        requestTitle: "Solicitar la publicación de una vida",
        requestBody: "Si una persona ha fallecido y su familia o alguien cercano quiere que su testimonio forme parte de este archivo, envía una petición. Un administrador la revisará antes de publicarla.",
        name: "Tu nombre",
        email: "Tu email",
        target: "Email de la persona",
        relation: "Tu relación con ella",
        death: "Fecha de fallecimiento",
        message: "Por qué debería publicarse",
        send: "Enviar petición",
        sent: "Hemos recibido tu petición. Un administrador la revisará.",
        years: "años",
      }
    : {
        eyebrow: "Historical archive",
        title: "Published lives, to be read and studied.",
        intro: "A public archive of testimonies. Here you can learn how someone thought, what they decided and what they learnt. Ask the AI about any published life.",
        search: "Search a life",
        empty: "No lives have been published yet.",
        emptyBody: "When someone chooses to publish their story, or a death is accepted, it will appear here.",
        deceased: "Deceased",
        living: "Published in life",
        moments: "moments",
        requestTitle: "Request the publication of a life",
        requestBody: "If someone has died and their family or a close person wants their testimony in this archive, send a request. An administrator will review it before publishing.",
        name: "Your name",
        email: "Your email",
        target: "Person’s email",
        relation: "Your relationship to them",
        death: "Date of death",
        message: "Why it should be published",
        send: "Send request",
        sent: "We have received your request. An administrator will review it.",
        years: "years",
      };
}

export function ArchiveIndexPage({ locale, lives }: { locale: "es" | "en"; lives: PublicLifeSummary[] }) {
  const t = copy(locale);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return lives;
    return lives.filter((life) => [life.displayName, life.firstYear, life.lastYear].some((value) => value?.toLocaleLowerCase().includes(needle)));
  }, [lives, query]);

  function submit(formData: FormData) {
    setError(undefined);
    formData.set("locale", locale);
    startTransition(async () => {
      const result = await submitPublicPublicationRequestAction(formData);
      if (!result.ok) setError(result.error);
      else setSent(true);
    });
  }

  return (
    <main className="page-shell overflow-hidden">
      <PublicSiteHeader locale={locale} current="archive" />
      <section className="container pb-16 pt-8 sm:pt-12">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="display mt-3 max-w-3xl text-4xl leading-tight sm:text-6xl">{t.title}</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">{t.intro}</p>
        <div className="relative mt-8 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
          <input className="input !pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
        </div>
        {filtered.length === 0 ? (
          <div className="card mt-10 max-w-xl p-8 text-center">
            <Landmark className="mx-auto text-[var(--moss)]" />
            <h2 className="display mt-4 text-2xl">{t.empty}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{t.emptyBody}</p>
          </div>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((life) => (
              <Link key={life.slug} href={`/${locale}/archive/${life.slug}` as Route} className="card p-5 transition hover:border-[#b9d0b8]">
                <span className={`pill ${life.deceased ? "!bg-[#fff0e5] !text-[#8a5a3d]" : ""}`}>{life.deceased ? t.deceased : t.living}</span>
                <h2 className="display mt-3 text-2xl">{life.displayName}</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {[life.firstYear, life.lastYear].filter(Boolean).join(" – ") || "—"}
                  {" · "}
                  {life.entryCount} {t.moments}
                </p>
              </Link>
            ))}
          </div>
        )}
        <section className="card mt-16 p-6 sm:p-8">
          <h2 className="display text-3xl">{t.requestTitle}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{t.requestBody}</p>
          {sent ? (
            <p className="mt-6 rounded-xl bg-[#edf5ec] p-3 text-sm text-[var(--moss-deep)]">{t.sent}</p>
          ) : (
            <form action={submit} className="mt-6 grid gap-4 md:grid-cols-2">
              <label><span className="field-label">{t.name}</span><input className="input" name="requesterName" required minLength={2} /></label>
              <label><span className="field-label">{t.email}</span><input className="input" name="requesterEmail" type="email" required /></label>
              <label><span className="field-label">{t.target}</span><input className="input" name="targetEmail" type="email" required /></label>
              <label><span className="field-label">{t.relation}</span><input className="input" name="relationship" required minLength={2} placeholder={locale === "es" ? "Hija, amigo, historiador…" : "Daughter, friend, historian…"} /></label>
              <label><span className="field-label">{t.death}</span><input className="input" name="deathDate" type="date" /></label>
              <label className="md:col-span-2"><span className="field-label">{t.message}</span><textarea className="textarea !min-h-24" name="message" required minLength={10} /></label>
              {error && <p className="field-error md:col-span-2">{error}</p>}
              <button disabled={pending} className="btn btn-primary md:col-span-2 sm:w-fit">{pending ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}{t.send}</button>
            </form>
          )}
        </section>
      </section>
      <PublicSiteFooter locale={locale} />
    </main>
  );
}
