"use client";

import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, UsersRound } from "lucide-react";
import type { SharedTimelineInvite } from "@/modules/family-tree/application/timeline-share-service";

export function SharedTimelinesBanner({ locale, shares }: { locale: "es" | "en"; shares: SharedTimelineInvite[] }) {
  if (shares.length === 0) return null;
  const t = locale === "es"
    ? { eyebrow: "Familia", title: "Cronogramas que puedes leer", body: "Formas parte de estos árboles y te dieron permiso para ver su historia. Es solo lectura: puedes copiarla a la tuya o exportar el árbol en GEDCOM." }
    : { eyebrow: "Family", title: "Timelines you can read", body: "You are part of these trees and they gave you permission to see their story. It is read-only: you can copy it into yours or export the tree as GEDCOM." };

  return (
    <section className="mb-10">
      <p className="eyebrow">{t.eyebrow}</p>
      <h2 className="display mt-2 text-2xl sm:text-3xl">{t.title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{t.body}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {shares.map((share) => (
          <Link
            key={share.ownerUserId}
            href={`/${locale}/app/shared/${share.ownerUserId}` as Route}
            className="card group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:border-[#b9d0b8]"
          >
            <span className="absolute inset-x-0 top-0 h-1.5 bg-[var(--sage)]" />
            <span className="inline-grid h-10 w-10 place-items-center rounded-full bg-[#edf5ec] text-[var(--moss)]">
              <UsersRound size={18} />
            </span>
            <h3 className="display mt-4 text-xl">{share.ownerDisplayName}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {locale === "es"
                ? `Te reconoció como ${share.personName}${share.relationLabel ? ` (${share.relationLabel.toLowerCase()})` : ""} y te dio acceso a su cronograma.`
                : `They recognised you as ${share.personName}${share.relationLabel ? ` (${share.relationLabel.toLowerCase()})` : ""} and gave you access to their timeline.`}
            </p>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-[var(--moss)]">
              {share.entryCount} {locale === "es" ? "momentos" : "moments"}
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--moss-deep)]">
              {locale === "es" ? "Abrir en solo lectura" : "Open read-only"}
              <ArrowRight size={15} />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
