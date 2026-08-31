"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { Bot, BookOpen, Landmark, LogOut, Search, Settings, Shield, Sprout, UsersRound } from "lucide-react";
import { signOutAction } from "@/modules/identity/application/auth-actions";
import { LanguageSwitcher } from "./language-switcher";
import { isArchiveAdmin } from "@/modules/archive/domain/archive";

export function AppHeader({ locale, email }: { locale: "es" | "en"; email?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const is = (path: string) => pathname === path || pathname.startsWith(`${path}/`);
  const isStory =
    is(`/${locale}/app`) &&
    !is(`/${locale}/app/reflect`) &&
    !is(`/${locale}/app/family`) &&
    !is(`/${locale}/app/settings`) &&
    !is(`/${locale}/app/search`) &&
    !is(`/${locale}/app/admin`) &&
    !is(`/${locale}/app/shared`);
  const admin = isArchiveAdmin(email);
  const t = locale === "es" ? { story: "Mi historia", reflect: "Reflexiona", tree: "Árbol", settings: "Ajustes", out: "Cerrar sesión", archive: "Archivo", admin: "Admin" } : { story: "My story", reflect: "Reflect", tree: "Tree", settings: "Settings", out: "Sign out", archive: "Archive", admin: "Admin" };

  function handleBrandClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (window.scrollY > 0) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function signOut() {
    startTransition(async () => {
      await signOutAction(locale);
      router.push(`/${locale}`);
      router.refresh();
    });
  }

  return (
    <header className="app-header">
      <Link onClick={handleBrandClick} className="app-brand" href={`/${locale}/app`}>
        <span className="brand-mark"><Sprout size={16} /></span>
        <span>Your Life Story</span>
      </Link>
      <form className="hidden min-w-40 flex-1 max-w-xs md:flex" action={`/${locale}/app/search`}>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={15} />
          <input aria-label={locale === "es" ? "Buscar" : "Search"} className="input !rounded-full !py-2 !pl-9 !text-sm" name="q" placeholder={locale === "es" ? "Buscar" : "Search"} />
        </div>
      </form>
      <div className="flex items-center gap-1">
        <Link title={t.story} className={`btn btn-quiet !p-2 ${isStory ? "!bg-[#edf3eb]" : ""}`} href={`/${locale}/app`}>
          <BookOpen size={17} />
          <span className="hidden md:inline text-xs">{t.story}</span>
        </Link>
        <Link title={t.reflect} className={`btn btn-quiet !p-2 ${is(`/${locale}/app/reflect`) ? "!bg-[#edf3eb]" : ""}`} href={`/${locale}/app/reflect`}>
          <Bot size={17} />
          <span className="hidden md:inline text-xs">{t.reflect}</span>
        </Link>
        <Link title={t.tree} className={`btn btn-quiet !p-2 ${is(`/${locale}/app/family`) ? "!bg-[#edf3eb]" : ""}`} href={`/${locale}/app/family`}>
          <UsersRound size={17} />
          <span className="hidden md:inline text-xs">{t.tree}</span>
        </Link>
        <Link title={t.archive} className="btn btn-quiet !p-2 hidden sm:inline-flex" href={`/${locale}/archive` as Route}>
          <Landmark size={16} />
          <span className="hidden md:inline text-xs">{t.archive}</span>
        </Link>
        {admin && (
          <Link title={t.admin} className={`btn btn-quiet !p-2 ${is(`/${locale}/app/admin`) ? "!bg-[#edf3eb]" : ""}`} href={`/${locale}/app/admin` as Route}>
            <Shield size={16} />
            <span className="hidden md:inline text-xs">{t.admin}</span>
          </Link>
        )}
        <Link title={t.settings} className="btn btn-quiet !p-2 hidden sm:inline-flex" href={`/${locale}/app/settings`}>
          <Settings size={16} />
        </Link>
        <LanguageSwitcher compact />
        <button disabled={pending} title={t.out} onClick={signOut} className="btn btn-quiet !p-2">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
