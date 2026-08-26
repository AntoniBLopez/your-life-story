import Link from "next/link";
import { ArrowRight, BrainCircuit, ChevronDown, LockKeyhole, Menu, Network, Sprout, TreePine, Globe } from "lucide-react";
import { LanguageSwitcher } from "@/modules/identity/presentation/components/language-switcher";

type Copy = {
  nav: { how: string; privacy: string; login: string; start: string };
  hero: { eyebrow: string; title: string; emphasis: string; body: string; primary: string; secondary: string; note: string };
  preview: { now: string; hard: string; learn: string; changing: string; labels: string[] };
  value: { eyebrow: string; title: string; cards: { title: string; body: string }[] };
  privacy: { eyebrow: string; title: string; body: string; points: string[] };
  cta: { title: string; body: string; action: string };
  footer: { tagline: string; how: string; privacy: string; login: string; copyright: string };
};

const copy: Record<"es" | "en", Copy> = {
  es: {
    nav: { how: "Cómo funciona", privacy: "Privacidad", login: "Entrar", start: "Empieza tu historia" },
    hero: { eyebrow: "Tu vida, con perspectiva", title: "Tu historia merece algo más que", emphasis: "perderse en la memoria.", body: "Registra los momentos que te hicieron ser quien eres. Observa tus cambios, conecta tus aprendizajes y vuelve a ellos cuando necesites claridad.", primary: "Empieza a escribir", secondary: "Descubre cómo funciona", note: "Un espacio privado, sólo para ti." },
    preview: { now: "Hoy", hard: "Un cambio difícil", learn: "Aprendí a pedir ayuda", changing: "Tu historia no es una lista. Es una evolución.", labels: ["Trabajo", "Relaciones", "Bienestar", "Aprendizajes"] },
    value: { eyebrow: "Un lugar para mirar con calma", title: "Saca tu vida de la cabeza. Encuentra el hilo que la une.", cards: [{ title: "Guarda lo importante", body: "Fechas, situaciones, giros y pequeños detalles que no quieres olvidar." }, { title: "Ve tus patrones", body: "Una línea temporal y un árbol de vida revelan conexiones que antes pasaban desapercibidas." }, { title: "Ponlo en perspectiva", body: "Una reflexión guiada te ayuda a hacer mejores preguntas, a tu ritmo." }] },
    privacy: { eyebrow: "Tu historia te pertenece", title: "Diseñado para la intimidad, no para el ruido.", body: "Cada recuerdo vive aislado en tu cuenta. Tú decides qué guardar, revisar, exportar o borrar.", points: ["Datos aislados por cuenta", "Archivos privados y enlaces seguros", "Consentimiento claro antes de usar la IA"] },
    cta: { title: "Empieza por un momento que recuerdes.", body: "No hace falta contarlo todo hoy. Una fecha, una situación o un aprendizaje es suficiente.", action: "Crear mi espacio privado" }, footer: { tagline: "Una forma más amable de recordar.", how: "Cómo funciona", privacy: "Privacidad", login: "Entrar", copyright: "Tu historia sigue siendo tuya." },
  },
  en: {
    nav: { how: "How it works", privacy: "Privacy", login: "Sign in", start: "Start your story" },
    hero: { eyebrow: "Your life, in perspective", title: "Your story deserves more than being", emphasis: "lost to memory.", body: "Capture the moments that shaped you. Notice your changes, connect your lessons and return to them whenever you need clarity.", primary: "Start writing", secondary: "See how it works", note: "A private space, just for you." },
    preview: { now: "Today", hard: "A difficult change", learn: "I learnt to ask for help", changing: "Your story is not a list. It is an evolution.", labels: ["Work", "Relationships", "Wellbeing", "Lessons"] },
    value: { eyebrow: "A place to look slowly", title: "Take your life out of your head. Find the thread that connects it.", cards: [{ title: "Keep what matters", body: "Dates, situations, turning points and little details you do not want to lose." }, { title: "Notice your patterns", body: "A timeline and life tree reveal connections you had not seen before." }, { title: "Put it in perspective", body: "Guided reflection helps you ask better questions, at your own pace." }] },
    privacy: { eyebrow: "Your story belongs to you", title: "Built for intimacy, not noise.", body: "Every memory stays isolated in your account. You decide what to keep, revisit, export or erase.", points: ["Account-isolated data", "Private files and secure links", "Clear consent before using AI"] },
    cta: { title: "Start with one moment you remember.", body: "You do not have to tell it all today. A date, a situation or a lesson is enough.", action: "Create my private space" }, footer: { tagline: "A gentler way to remember.", how: "How it works", privacy: "Privacy", login: "Sign in", copyright: "Your story is still yours." },
  },
};

export function LandingPage({ locale }: { locale: "es" | "en" }) {
  const activeLocale = locale === "en" ? "en" : "es";
  const t = copy[activeLocale];

  // Header component
  const Header = () => (
    <header className="container flex items-center justify-between gap-2 py-4 sm:py-5">
      <Link href={`/${activeLocale}`} className="flex items-center gap-2.5 font-bold">
        <span className="brand-mark"><Sprout size={17} /></span>
        <span className="display text-lg">Your Life Story</span>
      </Link>
      <nav className="hidden items-center gap-6 text-sm font-semibold text-[var(--muted)] md:flex">
        <a href="#how">{t.nav.how}</a>
        <a href="#privacy">{t.nav.privacy}</a>
      </nav>
      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        <LanguageSwitcher compact />
        <div className="hidden items-center gap-1 sm:flex">
          <Link className="btn btn-quiet" href={`/${activeLocale}/login`}>{t.nav.login}</Link>
          <Link className="btn btn-primary !px-3 text-xs sm:!px-5 sm:text-sm" href={`/${activeLocale}/register`}>
            {t.nav.start}
            <ArrowRight size={15} />
          </Link>
        </div>
        <details className="relative sm:hidden">
          <summary aria-label={activeLocale === "es" ? "Abrir menú" : "Open menu"} className="btn btn-quiet !p-2 marker:hidden">
            <Menu size={21} />
          </summary>
          <div className="absolute right-0 top-12 z-30 grid min-w-52 gap-1 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-2 text-sm font-semibold shadow-xl">
            <a className="rounded-xl px-3 py-2.5 hover:bg-[#edf3eb]" href="#how">{t.nav.how}</a>
            <a className="rounded-xl px-3 py-2.5 hover:bg-[#edf3eb]" href="#privacy">{t.nav.privacy}</a>
            <Link className="rounded-xl px-3 py-2.5 hover:bg-[#edf3eb]" href={`/${activeLocale}/login`}>{t.nav.login}</Link>
            <Link className="btn btn-primary mt-1" href={`/${activeLocale}/register`}>
              {t.nav.start}
              <ArrowRight size={15} />
            </Link>
          </div>
        </details>
      </div>
    </header>
  );

  // Hero section component
  const HeroSection = () => (
    <section className="container grid gap-10 pb-20 pt-10 sm:gap-12 sm:pt-14 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:pb-28 lg:pt-22">
      <div className="fade-in max-w-2xl">
        <p className="eyebrow">{t.hero.eyebrow}</p>
        <h1 className="display mt-5 max-w-3xl text-4xl leading-[.99] text-[var(--ink)] sm:text-6xl lg:text-7xl">
          {t.hero.title} <em className="font-normal text-[var(--moss)]">{t.hero.emphasis}</em>
        </h1>
        <p className="mt-7 max-w-xl text-lg leading-8 text-[var(--muted)]">{t.hero.body}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link className="btn btn-primary w-full sm:w-auto" href={`/${locale}/register`}>
            {t.hero.primary}
            <ArrowRight size={16} />
          </Link>
          <a className="btn btn-secondary w-full sm:w-auto" href="#how">
            {t.hero.secondary}
            <ChevronDown size={15} />
          </a>
        </div>
        <p className="mt-5 flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
          <LockKeyhole size={14} className="text-[var(--moss)]" />
          {t.hero.note}
        </p>
      </div>
      <div className="fade-in relative mx-auto w-full max-w-xl [animation-delay:120ms]">
        <div className="absolute right-0 -top-8 h-48 w-48 rounded-full bg-[var(--sage)] blur-3xl sm:-right-10 sm:-top-12 sm:h-56 sm:w-56" />
        <div className="card relative rotate-[-1deg] p-4 sm:rotate-[-2deg] sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.12em] text-[var(--moss)]">{t.preview.now}</p>
              <p className="display mt-1 text-2xl">{t.preview.changing}</p>
            </div>
            <div className="rounded-full bg-[#edf3eb] p-3 text-[var(--moss)]">
              <Sprout size={22} />
            </div>
          </div>
          <div className="relative mx-2 mt-8 h-36 border-l border-dashed border-[#a9c2a7]">
            <div className="absolute left-0 top-2 -translate-x-1/2">
              <span className="block h-3 w-3 rounded-full border-2 border-white bg-[var(--rose)] shadow" />
            </div>
            <div className="absolute left-4 top-0 rounded-xl bg-[#fff4ec] px-3 py-2 text-xs font-bold text-[#79513b]">{t.preview.hard}</div>
            <div className="absolute bottom-7 left-0 -translate-x-1/2">
              <span className="block h-3 w-3 rounded-full border-2 border-white bg-[var(--moss)] shadow" />
            </div>
            <div className="absolute bottom-4 left-4 rounded-xl bg-[#eef5ec] px-3 py-2 text-xs font-bold text-[var(--moss-deep)]">{t.preview.learn}</div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {t.preview.labels.map((label, index) => (
              <span
                key={label}
                className="pill"
                style={{ background: index === 1 ? "#fff0e5" : undefined }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="absolute -bottom-7 left-2 rounded-2xl border border-[#f0ddd0] bg-[#fffaf4] p-3 shadow-lg sm:-left-5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#a96d4d]">
            {activeLocale === "es" ? "Un momento a la vez" : "One moment at a time"}
          </p>
          <p className="display text-lg">
            {activeLocale === "es" ? "Vuelve a ti." : "Come back to you."}
          </p>
        </div>
      </div>
    </section>
  );

  // How it works section component
  const HowItWorksSection = () => (
    <section id="how" className="border-y border-[var(--line)] bg-[#fffdf9bd] py-22">
      <div className="container">
        <p className="eyebrow">{t.value.eyebrow}</p>
        <h2 className="display mt-4 max-w-3xl text-4xl leading-tight sm:text-5xl">{t.value.title}</h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {t.value.cards.map((card, index) => {
            const Icon = [Network, TreePine, BrainCircuit][index];
            return (
              <article key={card.title} className="card p-6">
                <span className="inline-grid h-10 w-10 place-items-center rounded-full bg-[#edf3eb] text-[var(--moss)]">
                  <Icon size={19} />
                </span>
                <h3 className="display mt-5 text-2xl">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{card.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );

  // Privacy section component
  const PrivacySection = () => (
    <section id="privacy" className="container grid gap-10 py-22 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
      <div>
        <p className="eyebrow">{t.privacy.eyebrow}</p>
        <h2 className="display mt-4 text-4xl leading-tight sm:text-5xl">{t.privacy.title}</h2>
      </div>
      <div className="card p-7">
        <p className="text-base leading-7 text-[var(--muted)]">{t.privacy.body}</p>
        <ul className="mt-6 space-y-3">
          {t.privacy.points.map((point) => (
            <li key={point} className="flex items-center gap-3 text-sm font-bold">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--sage)] text-[var(--moss-deep)]">✓</span>
              {point}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );

  // CTA section component
  const CtaSection = () => (
    <section className="container pb-16">
      <div className="rounded-[2rem] bg-[var(--moss-deep)] px-5 py-12 text-center text-white sm:px-14 sm:py-14">
        <p className="eyebrow !text-[#b8d2ae]">Your Life Story</p>
        <h2 className="display mx-auto mt-4 max-w-2xl text-4xl leading-tight sm:text-5xl">{t.cta.title}</h2>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-[#d9e5d5]">{t.cta.body}</p>
        <Link className="btn mt-8 w-full !bg-white !text-[var(--moss-deep)] sm:w-auto" href={`/${activeLocale}/register`}>
          {t.cta.action}
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );

  // Footer component
  const Footer = () => (
    <footer className="border-t border-[var(--line)] bg-[#fffdf9b8] py-8 sm:py-10">
      <div className="container flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href={`/${activeLocale}`} className="flex items-center gap-2 font-bold">
            <span className="brand-mark"><Sprout size={15} /></span>
            <span className="display text-lg">Your Life Story</span>
          </Link>
          <p className="mt-2 text-sm text-[var(--muted)]">{t.footer.tagline}</p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-[var(--muted)]">
          <a href="#how">{t.footer.how}</a>
          <a href="#privacy">{t.footer.privacy}</a>
          <Link href={`/${activeLocale}/login`}>{t.footer.login}</Link>
        </nav>
        <div className="text-xs text-[var(--muted)]">
          <p>© 2026 · {t.footer.copyright}</p>
        </div>
      </div>
      <div className="container py-4"><hr className="border-[var(--line)] mx-auto w-1/3" /></div>
      <div className="container py-4 text-center text-xs text-[var(--muted)]">Web hecha por <a href="https://antonilopez.dev/web" target="_blank" rel="noopener noreferrer" className="underline">Antoni</a></div>
    </footer>
  );

  return (
    <main className="page-shell overflow-hidden">
      <Header />
      <HeroSection />
      <HowItWorksSection />
      <PrivacySection />
      <CtaSection />
      <Footer />
    </main>
  );
}
