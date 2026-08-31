"use client";

import { Languages } from "lucide-react";
import type { Route } from "next";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale() as "es" | "en";
  const router = useRouter();
  const pathname = usePathname();
  const nextLocale = locale === "es" ? "en" : "es";
  const label = locale === "es" ? "ES" : "EN";
  const title = locale === "es" ? "Cambiar a inglés" : "Switch to Spanish";

  function switchLocale() {
    const nextPath = pathname.replace(/^\/(es|en)(?=\/|$)/, `/${nextLocale}`);
    router.replace((nextPath || `/${nextLocale}`) as Route);
  }

  return (
    <button type="button" onClick={switchLocale} title={title} aria-label={title} className={compact ? "btn btn-quiet" : "btn btn-secondary"}>
      <Languages size={16} aria-hidden />
      {label}
    </button>
  );
}
