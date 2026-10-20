"use client";

import Link from "next/link";
import type { Route } from "next";
import { useLocale } from "next-intl";
import { reflectionCopy } from "../../domain/reflection-copy";

export function ReflectionMissing() {
  const locale = useLocale() === "en" ? "en" : "es";
  const copy = reflectionCopy(locale);
  return (
    <div className="grid min-h-0 flex-1 place-items-center bg-[var(--cream)] p-6 text-center">
      <div>
        <p className="text-sm text-[var(--muted)]">{copy.notFound}</p>
        <Link href={`/${locale}/app/reflect` as Route} className="btn btn-secondary mt-4">{copy.newChat}</Link>
      </div>
    </div>
  );
}
