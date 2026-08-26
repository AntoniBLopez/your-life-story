"use client";

import { Languages } from "lucide-react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale() as "es" | "en";
  const router = useRouter();
  const pathname = usePathname();
  const nextLocale = locale === "es" ? "en" : "es";

  function switchLocale() {
    const nextPath = pathname.replace(/^\/(es|en)(?=\/|$)/, `/${nextLocale}`);
    router.replace(nextPath || `/${nextLocale}`);
  }

  return (
    <button type="button" onClick={switchLocale} className={compact ? "btn btn-quiet" : "btn btn-secondary"}>
      <Languages size={16} aria-hidden />
      {locale === "es" ? "EN" : "ES"}
    </button>
  );
}
