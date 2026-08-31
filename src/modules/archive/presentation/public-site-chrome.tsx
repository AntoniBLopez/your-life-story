import Link from "next/link";
import type { Route } from "next";
import { Menu, Sprout } from "lucide-react";
import { LanguageSwitcher } from "@/modules/identity/presentation/components/language-switcher";

export function PublicSiteHeader({ locale, current }: { locale: "es" | "en"; current?: "home" | "archive" }) {
  const t = locale === "es"
    ? { archive: "Archivo de vidas", login: "Entrar", start: "Empieza tu historia", menu: "Abrir menú" }
    : { archive: "Life archive", login: "Sign in", start: "Start your story", menu: "Open menu" };

  return (
    <header className="container flex items-center justify-between gap-2 py-4 sm:py-5">
      <Link href={`/${locale}`} className="flex items-center gap-2.5 font-bold">
        <span className="brand-mark"><Sprout size={17} /></span>
        <span className="display text-lg">Your Life Story</span>
      </Link>
      <nav className="hidden items-center gap-6 text-sm font-semibold text-[var(--muted)] md:flex">
        <Link className={current === "archive" ? "text-[var(--moss-deep)]" : ""} href={`/${locale}/archive` as Route}>
          {t.archive}
        </Link>
      </nav>
      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        <LanguageSwitcher compact />
        <div className="hidden items-center gap-1 sm:flex">
          <Link className="btn btn-quiet" href={`/${locale}/login`}>{t.login}</Link>
          <Link className="btn btn-primary !px-3 text-xs sm:!px-5 sm:text-sm" href={`/${locale}/register`}>{t.start}</Link>
        </div>
        <details className="relative sm:hidden">
          <summary aria-label={t.menu} className="btn btn-quiet !p-2 marker:hidden">
            <Menu size={21} />
          </summary>
          <div className="absolute right-0 top-12 z-30 grid min-w-52 gap-1 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-2 text-sm font-semibold shadow-xl">
            <Link className="rounded-xl px-3 py-2.5 hover:bg-[#edf3eb]" href={`/${locale}/archive` as Route}>{t.archive}</Link>
            <Link className="rounded-xl px-3 py-2.5 hover:bg-[#edf3eb]" href={`/${locale}/login`}>{t.login}</Link>
            <Link className="btn btn-primary mt-1" href={`/${locale}/register`}>{t.start}</Link>
          </div>
        </details>
      </div>
    </header>
  );
}

export function PublicSiteFooter({ locale }: { locale: "es" | "en" }) {
  const t = locale === "es"
    ? { tagline: "Un archivo público de vidas y testimonios.", archive: "Archivo de vidas", login: "Entrar", copyright: "Las historias publicadas siguen siendo de quienes las escribieron." }
    : { tagline: "A public archive of lives and testimonies.", archive: "Life archive", login: "Sign in", copyright: "Published stories still belong to those who wrote them." };

  return (
    <footer className="border-t border-[var(--line)] bg-[#fffdf9b8] py-8 sm:py-10">
      <div className="container flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href={`/${locale}`} className="flex items-center gap-2 font-bold">
            <span className="brand-mark"><Sprout size={15} /></span>
            <span className="display text-lg">Your Life Story</span>
          </Link>
          <p className="mt-2 text-sm text-[var(--muted)]">{t.tagline}</p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-[var(--muted)]">
          <Link href={`/${locale}/archive` as Route}>{t.archive}</Link>
          <Link href={`/${locale}/login`}>{t.login}</Link>
        </nav>
        <p className="text-xs text-[var(--muted)]">© 2026 · {t.copyright}</p>
      </div>
    </footer>
  );
}

