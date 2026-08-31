"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, BookOpen, BrainCircuit, Compass, Landmark, LoaderCircle, Mountain, Search, Send, Sparkles } from "lucide-react";
import type { PublicLifeSummary } from "@/modules/archive/domain/archive";
import { submitPublicPublicationRequestAction } from "@/modules/archive/application/archive-actions";
import { PublicSiteFooter, PublicSiteHeader } from "./public-site-chrome";

function copy(locale: "es" | "en") {
  return locale === "es"
    ? {
        eyebrow: "Archivo de vidas",
        title: "Vidas publicadas para ser leídas,",
        emphasis: "estudiadas y comprendidas.",
        intro: "Un archivo público de testimonios. Aquí puedes ver cómo pensaba alguien, qué decidió, qué aprendió, cuáles fueron sus momentos críticos y cómo los superó. Pregunta a la IA sobre cualquier vida publicada.",
        search: "Buscar una vida, un año o un nombre",
        browse: "Explorar testimonios",
        guides: [
          { title: "Cómo pensaban", body: "Lee las palabras con las que se explicaban el mundo, no un resumen ajeno." },
          { title: "Qué decidieron", body: "Sigue los giros, las dudas y las elecciones que marcaron su camino." },
          { title: "Qué aprendieron", body: "Qué se llevaron de lo difícil, y qué les cambió de verdad." },
          { title: "Cómo lo superaron", body: "Momentos críticos, inflexiones y la forma en que salieron adelante." },
        ],
        lives: "Testimonios publicados",
        livesTitle: "Historias para estudiar.",
        empty: "Aún no hay vidas publicadas.",
        emptyBody: "Cuando alguien dé permiso para publicar su historia, o cuando confirmemos un fallecimiento de quien ya lo había concedido, aparecerá aquí.",
        noMatches: "Ningún testimonio coincide con esa búsqueda.",
        deceased: "Fallecida",
        living: "Publicada en vida",
        moments: "momentos",
        lesson: "Aprendizaje",
        turning: "Momento clave",
        read: "Leer esta vida",
        ask: "Pregunta a la IA",
        askBody: "Cuando abras un testimonio, puedes preguntar por patrones, decisiones, aprendizajes o cómo atravesó un momento difícil. La IA responde sólo con lo que esa persona dejó escrito.",
        requestTitle: "Solicitar la publicación de una vida",
        requestBody: "Si una persona ha fallecido, envía una petición. Un administrador la revisará. Solo se publicará su vida si, en vida, había dado permiso en sus ajustes para que su historia se hiciera pública.",
        name: "Tu nombre",
        email: "Tu email",
        target: "Email de la persona",
        relation: "Tu relación con ella",
        death: "Fecha de fallecimiento",
        message: "Por qué debería publicarse",
        send: "Enviar petición",
        sent: "Hemos recibido tu petición. Un administrador la revisará.",
        previewNow: "Un testimonio",
        previewHard: "Un momento crítico",
        previewLearn: "Aprendí a pedir ayuda",
        previewNote: "Así se lee una vida publicada",
        previewFloat: "Lecciones, giros, superación",
        previewFloatBody: "Cómo salieron adelante.",
      }
    : {
        eyebrow: "Life archive",
        title: "Published lives, to be read,",
        emphasis: "studied and understood.",
        intro: "A public archive of testimonies. Here you can see how someone thought, what they decided, what they learnt, which moments were critical and how they overcame them. Ask the AI about any published life.",
        search: "Search a life, a year or a name",
        browse: "Browse testimonies",
        guides: [
          { title: "How they thought", body: "Read the words they used to make sense of the world, not someone else’s summary." },
          { title: "What they decided", body: "Follow the turns, doubts and choices that shaped their path." },
          { title: "What they learnt", body: "What they took from what was hard, and what actually changed them." },
          { title: "How they overcame it", body: "Critical moments, turning points and the way they came through." },
        ],
        lives: "Published testimonies",
        livesTitle: "Stories to study.",
        empty: "No lives have been published yet.",
        emptyBody: "When someone gives permission to publish their story, or when we confirm the death of someone who already had, it will appear here.",
        noMatches: "No testimony matches that search.",
        deceased: "Deceased",
        living: "Published in life",
        moments: "moments",
        lesson: "Lesson",
        turning: "Turning point",
        read: "Read this life",
        ask: "Ask the AI",
        askBody: "When you open a testimony, you can ask about patterns, decisions, lessons or how they got through a hard moment. The AI answers only from what that person left in writing.",
        requestTitle: "Request the publication of a life",
        requestBody: "If someone has died, send a request. An administrator will review it. Their life will only be published if they gave permission in their settings, while they were alive, for their story to be made public.",
        name: "Your name",
        email: "Your email",
        target: "Person’s email",
        relation: "Your relationship to them",
        death: "Date of death",
        message: "Why it should be published",
        send: "Send request",
        sent: "We have received your request. An administrator will review it.",
        previewNow: "A testimony",
        previewHard: "A critical moment",
        previewLearn: "I learnt to ask for help",
        previewNote: "This is how a published life is read",
        previewFloat: "Lessons, turns, coming through",
        previewFloatBody: "How they came through.",
      };
}

const GUIDE_ICONS = [Compass, BookOpen, Sparkles, Mountain];
const CARD_TINTS = ["#edf5ec", "#fff4ec", "#f7efe6", "#eef3f7"];

export function ArchiveIndexPage({ locale, lives }: { locale: "es" | "en"; lives: PublicLifeSummary[] }) {
  const t = copy(locale);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return lives;
    return lives.filter((life) => [life.displayName, life.firstYear, life.lastYear, life.highlight].some((value) => value?.toLocaleLowerCase().includes(needle)));
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
      <section className="container grid gap-10 pb-16 pt-8 sm:gap-12 sm:pt-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
        <div className="fade-in max-w-2xl">
          <p className="eyebrow">{t.eyebrow}</p>
          <h1 className="display mt-4 max-w-3xl text-4xl leading-[.99] text-[var(--ink)] sm:text-6xl">
            {t.title} <em className="font-normal text-[var(--moss)]">{t.emphasis}</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted)]">{t.intro}</p>
          <div className="relative mt-8 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
            <input className="input !pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
          </div>
          <a className="btn btn-primary mt-5 w-full sm:w-auto" href="#lives">
            {t.browse}
            <ArrowRight size={15} />
          </a>
        </div>
        <div className="fade-in relative mx-auto w-full max-w-xl pb-8 [animation-delay:120ms]">
          <div className="absolute right-0 -top-8 h-48 w-48 rounded-full bg-[var(--sage)] blur-3xl sm:-right-8 sm:h-56 sm:w-56" />
          <div className="absolute -left-6 bottom-8 h-36 w-36 rounded-full bg-[var(--peach)]/40 blur-3xl" />
          <div className="card relative rotate-[-1deg] p-4 sm:rotate-[-2deg] sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.12em] text-[var(--moss)]">{t.previewNow}</p>
                <p className="display mt-1 text-2xl">{t.previewNote}</p>
              </div>
              <div className="rounded-full bg-[#edf3eb] p-3 text-[var(--moss)]">
                <Landmark size={22} />
              </div>
            </div>
            <div className="relative mx-2 mt-8 h-36 border-l border-dashed border-[#a9c2a7]">
              <div className="absolute left-0 top-2 -translate-x-1/2">
                <span className="block h-3 w-3 rounded-full border-2 border-white bg-[var(--rose)] shadow" />
              </div>
              <div className="absolute left-4 top-0 rounded-xl bg-[#fff4ec] px-3 py-2 text-xs font-bold text-[#79513b]">{t.previewHard}</div>
              <div className="absolute bottom-7 left-0 -translate-x-1/2">
                <span className="block h-3 w-3 rounded-full border-2 border-white bg-[var(--moss)] shadow" />
              </div>
              <div className="absolute bottom-4 left-4 rounded-xl bg-[#eef5ec] px-3 py-2 text-xs font-bold text-[var(--moss-deep)]">{t.previewLearn}</div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="pill">{t.lesson}</span>
              <span className="pill" style={{ background: "#fff0e5" }}>{t.turning}</span>
              <span className="pill">{t.ask}</span>
            </div>
          </div>
          <div className="absolute -bottom-2 left-2 rounded-2xl border border-[#f0ddd0] bg-[#fffaf4] p-3 shadow-lg sm:-bottom-4 sm:-left-5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#a96d4d]">{t.previewFloat}</p>
            <p className="display text-lg">{t.previewFloatBody}</p>
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--line)] bg-[#fffdf9bd] py-16 sm:py-20">
        <div className="container">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.guides.map((guide, index) => {
              const Icon = GUIDE_ICONS[index];
              return (
                <article key={guide.title} className="card p-5">
                  <span className="inline-grid h-10 w-10 place-items-center rounded-full text-[var(--moss-deep)]" style={{ background: CARD_TINTS[index] }}>
                    <Icon size={18} />
                  </span>
                  <h2 className="display mt-4 text-xl">{guide.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{guide.body}</p>
                </article>
              );
            })}
          </div>
          <div className="card mt-5 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-4">
              <span className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#edf3eb] text-[var(--moss)]">
                <BrainCircuit size={18} />
              </span>
              <div>
                <h2 className="display text-xl">{t.ask}</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">{t.askBody}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="lives" className="container py-16 sm:py-20">
        <p className="eyebrow">{t.lives}</p>
        <h2 className="display mt-3 text-3xl sm:text-4xl">{lives.length === 0 ? t.empty : t.livesTitle}</h2>
        {filtered.length === 0 ? (
          <div className="card mt-8 max-w-2xl p-8 text-center">
            <Landmark className="mx-auto text-[var(--moss)]" />
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{lives.length === 0 ? t.emptyBody : t.noMatches}</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((life, index) => (
              <Link key={life.slug} href={`/${locale}/archive/${life.slug}` as Route} className="card group relative overflow-hidden p-6 transition hover:-translate-y-0.5 hover:border-[#b9d0b8]">
                <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: CARD_TINTS[index % CARD_TINTS.length] }} />
                <span className={`pill ${life.deceased ? "!bg-[#fff0e5] !text-[#8a5a3d]" : ""}`}>{life.deceased ? t.deceased : t.living}</span>
                <h3 className="display mt-4 text-2xl">{life.displayName}</h3>
                <p className="mt-2 text-sm font-semibold text-[var(--moss-deep)]">
                  {[life.firstYear, life.lastYear].filter(Boolean).join(" – ") || "—"}
                  {" · "}
                  {life.entryCount} {t.moments}
                </p>
                {life.highlight && (
                  <p className="mt-4 rounded-xl px-3 py-3 text-sm leading-6 text-[var(--ink)]" style={{ background: CARD_TINTS[index % CARD_TINTS.length] }}>
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-[var(--moss)]">{life.highlightKind === "lesson" ? t.lesson : t.turning}</span>
                    {life.highlight}
                  </p>
                )}
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--moss-deep)]">
                  {t.read}
                  <ArrowRight size={15} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="container pb-16">
        <div className="rounded-[2rem] bg-[var(--moss-deep)] px-5 py-10 text-white sm:px-10 sm:py-12">
          <p className="eyebrow !text-[#b8d2ae]">{t.eyebrow}</p>
          <h2 className="display mt-3 max-w-2xl text-3xl leading-tight sm:text-4xl">{t.requestTitle}</h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#d9e5d5]">{t.requestBody}</p>
          {sent ? (
            <p className="mt-6 max-w-xl rounded-xl bg-white/10 p-3 text-sm">{t.sent}</p>
          ) : (
            <form action={submit} className="mt-8 grid gap-4 md:grid-cols-2">
              <label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#b8d2ae]">{t.name}</span><input className="input" name="requesterName" required minLength={2} /></label>
              <label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#b8d2ae]">{t.email}</span><input className="input" name="requesterEmail" type="email" required /></label>
              <label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#b8d2ae]">{t.target}</span><input className="input" name="targetEmail" type="email" required /></label>
              <label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#b8d2ae]">{t.relation}</span><input className="input" name="relationship" required minLength={2} placeholder={locale === "es" ? "Hija, amigo, historiador…" : "Daughter, friend, historian…"} /></label>
              <label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#b8d2ae]">{t.death}</span><input className="input" name="deathDate" type="date" /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#b8d2ae]">{t.message}</span><textarea className="textarea !min-h-24" name="message" required minLength={10} /></label>
              {error && <p className="field-error md:col-span-2 !text-[#ffd4d0]">{error}</p>}
              <button disabled={pending} className="btn md:col-span-2 w-full !bg-white !text-[var(--moss-deep)] sm:w-fit">{pending ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}{t.send}</button>
            </form>
          )}
        </div>
      </section>
      <PublicSiteFooter locale={locale} />
    </main>
  );
}
