"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { Bot, BookOpen, LogOut, Menu, Settings, Shield, Sprout, UsersRound } from "lucide-react";
import { signOutAction } from "@/modules/identity/application/auth-actions";
import { AppNavLink } from "@/modules/identity/presentation/components/app-nav-link";
import { LanguageSwitcher } from "@/modules/identity/presentation/components/language-switcher";
import { isArchiveAdmin } from "@/modules/archive/domain/archive";

export function PublicSiteHeader({
  locale,
  current,
  authenticated = false,
  email,
}: {
  locale: "es" | "en";
  current?: "home" | "archive";
  authenticated?: boolean;
  email?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const admin = isArchiveAdmin(email);
  const is = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  const t = locale === "es"
    ? {
        archive: "Archivo de vidas",
        login: "Entrar",
        start: "Empieza tu historia",
        menu: "Abrir menú",
        story: "Mi historia",
        reflect: "Reflexiona",
        tree: "Árbol",
        settings: "Ajustes",
        admin: "Admin",
        out: "Cerrar sesión",
      }
    : {
        archive: "Life archive",
        login: "Sign in",
        start: "Start your story",
        menu: "Open menu",
        story: "My story",
        reflect: "Reflect",
        tree: "Tree",
        settings: "Settings",
        admin: "Admin",
        out: "Sign out",
      };

  function signOut() {
    startTransition(async () => {
      await signOutAction(locale);
      router.push(`/${locale}`);
      router.refresh();
    });
  }

  const brandHref = authenticated ? `/${locale}/app` : `/${locale}`;
  const showArchiveLink = current !== "archive";

  const appLinks = authenticated ? (
    <>
      <AppNavLink title={t.story} active={false} href={`/${locale}/app`}>
        <BookOpen size={17} />
        <span className="hidden md:inline text-xs">{t.story}</span>
      </AppNavLink>
      <AppNavLink title={t.tree} active={false} href={`/${locale}/app/family`}>
        <UsersRound size={17} />
        <span className="hidden md:inline text-xs">{t.tree}</span>
      </AppNavLink>
      <AppNavLink title={t.reflect} active={false} href={`/${locale}/app/reflect`}>
        <Bot size={17} />
        <span className="hidden md:inline text-xs">{t.reflect}</span>
      </AppNavLink>
      <Link title={t.settings} className="btn btn-quiet !p-2 hidden sm:inline-flex" href={`/${locale}/app/settings`}>
        <Settings size={16} />
      </Link>
      {admin && (
        <Link title={t.admin} className={`btn btn-quiet !p-2 hidden sm:inline-flex ${is(`/${locale}/app/admin`) ? "!bg-[#edf3eb]" : ""}`} href={`/${locale}/app/admin` as Route}>
          <Shield size={16} />
          <span className="hidden md:inline text-xs">{t.admin}</span>
        </Link>
      )}
    </>
  ) : null;

  return (
    <header className="container flex items-center justify-between gap-2 py-4 sm:py-5">
      <Link href={brandHref as Route} className="flex shrink-0 items-center gap-2.5 font-bold">
        <span className="brand-mark"><Sprout size={17} /></span>
        <span className="display text-lg">Your Life Story</span>
      </Link>

      {authenticated ? (
        <div className="hidden items-center gap-1 md:flex">{appLinks}</div>
      ) : showArchiveLink ? (
        <nav className="hidden items-center gap-6 text-sm font-semibold text-[var(--muted)] md:flex">
          <Link href={`/${locale}/archive` as Route}>{t.archive}</Link>
        </nav>
      ) : (
        <div className="hidden flex-1 md:block" />
      )}

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {authenticated && <div className="flex items-center gap-1 md:hidden">{appLinks}</div>}
        <LanguageSwitcher compact />
        {!authenticated && (
          <div className="hidden items-center gap-1 sm:flex">
            <Link className="btn btn-quiet" href={`/${locale}/login`}>{t.login}</Link>
            <Link className="btn btn-primary !px-3 text-xs sm:!px-5 sm:text-sm" href={`/${locale}/register`}>{t.start}</Link>
          </div>
        )}
        {authenticated && (
          <button disabled={pending} title={t.out} onClick={signOut} className="btn btn-quiet !p-2 hidden sm:inline-flex">
            <LogOut size={16} />
          </button>
        )}
        <details className="relative">
          <summary aria-label={t.menu} className="btn btn-quiet !p-2 marker:hidden sm:hidden">
            <Menu size={21} />
          </summary>
          <div className="absolute right-0 top-12 z-30 grid min-w-52 gap-1 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-2 text-sm font-semibold shadow-xl">
            {authenticated ? (
              <>
                <Link className="rounded-xl px-3 py-2.5 hover:bg-[#edf3eb]" href={`/${locale}/app`}>{t.story}</Link>
                <Link className="rounded-xl px-3 py-2.5 hover:bg-[#edf3eb]" href={`/${locale}/app/family`}>{t.tree}</Link>
                <Link className="rounded-xl px-3 py-2.5 hover:bg-[#edf3eb]" href={`/${locale}/app/reflect`}>{t.reflect}</Link>
                <Link className="rounded-xl px-3 py-2.5 hover:bg-[#edf3eb]" href={`/${locale}/app/settings`}>{t.settings}</Link>
                {admin && <Link className="rounded-xl px-3 py-2.5 hover:bg-[#edf3eb]" href={`/${locale}/app/admin` as Route}>{t.admin}</Link>}
                <button type="button" disabled={pending} onClick={signOut} className="rounded-xl px-3 py-2.5 text-left hover:bg-[#edf3eb]">{t.out}</button>
              </>
            ) : (
              <>
                {showArchiveLink && <Link className="rounded-xl px-3 py-2.5 hover:bg-[#edf3eb]" href={`/${locale}/archive` as Route}>{t.archive}</Link>}
                <Link className="rounded-xl px-3 py-2.5 hover:bg-[#edf3eb]" href={`/${locale}/login`}>{t.login}</Link>
                <Link className="btn btn-primary mt-1" href={`/${locale}/register`}>{t.start}</Link>
              </>
            )}
          </div>
        </details>
      </div>
    </header>
  );
}

export function PublicSiteFooter({ locale, authenticated = false }: { locale: "es" | "en"; authenticated?: boolean }) {
  const t = locale === "es"
    ? { tagline: "Un archivo público de historias de vidas.", archive: "Archivo de vidas", login: "Entrar", app: "Mi historia", copyright: "Las historias publicadas siguen siendo de quienes las escribieron." }
    : { tagline: "A public archive of life stories.", archive: "Life archive", login: "Sign in", app: "My story", copyright: "Published stories still belong to those who wrote them." };

  return (
    <footer className="border-t border-[var(--line)] bg-[#fffdf9b8] py-8 sm:py-10">
      <div className="container flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href={authenticated ? `/${locale}/app` : `/${locale}`} className="flex items-center gap-2 font-bold">
            <span className="brand-mark"><Sprout size={15} /></span>
            <span className="display text-lg">Your Life Story</span>
          </Link>
          <p className="mt-2 text-sm text-[var(--muted)]">{t.tagline}</p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-[var(--muted)]">
          {authenticated ? (
            <Link href={`/${locale}/app`}>{t.app}</Link>
          ) : (
            <>
              <Link href={`/${locale}/archive` as Route}>{t.archive}</Link>
              <Link href={`/${locale}/login`}>{t.login}</Link>
            </>
          )}
        </nav>
        <p className="text-xs text-[var(--muted)]">© 2026 · {t.copyright}</p>
      </div>
    </footer>
  );
}
