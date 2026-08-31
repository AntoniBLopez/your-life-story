"use client";

import { useState, useTransition } from "react";
import { Check, Landmark, LoaderCircle, Search, Shield, X } from "lucide-react";
import type { ArchivePublicationRequest } from "@/modules/archive/domain/archive";
import { adminPublishUserAction, adminUnpublishUserAction, reviewPublicationRequestAction } from "@/modules/archive/application/archive-actions";

type AdminUserRow = {
  id: string;
  email: string;
  displayName: string | null;
  publicArchiveConsent: boolean;
  publishedAt: string | null;
  deceasedAt: string | null;
  archiveSlug: string | null;
  entryCount: number;
};

export function AdminPanel({
  locale,
  requests,
  initialUsers,
}: {
  locale: "es" | "en";
  requests: ArchivePublicationRequest[];
  initialUsers: AdminUserRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [query, setQuery] = useState("");
  const users = initialUsers;
  const t = locale === "es"
    ? { eyebrow: "Administración", title: "Archivo público y fallecimientos", intro: "Revisa peticiones, marca personas como fallecidas y publica sus vidas en el archivo histórico.", pending: "Pendientes", none: "No hay peticiones pendientes.", approve: "Publicar y marcar fallecida", reject: "Rechazar", search: "Buscar cuenta por nombre o email", consent: "Quiso publicar", published: "En archivo", deceased: "Fallecida", moments: "momentos", publish: "Publicar", publishDead: "Publicar como fallecida", unpublish: "Retirar" }
    : { eyebrow: "Administration", title: "Public archive and deaths", intro: "Review requests, mark people as deceased and publish their lives in the historical archive.", pending: "Pending", none: "There are no pending requests.", approve: "Publish and mark deceased", reject: "Reject", search: "Search an account by name or email", consent: "Wanted to publish", published: "In archive", deceased: "Deceased", moments: "moments", publish: "Publish", publishDead: "Publish as deceased", unpublish: "Remove" };

  function review(id: string, decision: "approved" | "rejected") {
    setError(undefined);
    startTransition(async () => {
      const result = await reviewPublicationRequestAction(id, decision, locale);
      if (!result.ok) setError(result.error);
      else window.location.reload();
    });
  }

  function publish(userId: string, deceased: boolean, deathDate?: string) {
    setError(undefined);
    startTransition(async () => {
      const result = await adminPublishUserAction(userId, deceased, deathDate || null, locale);
      if (!result.ok) setError(result.error);
      else window.location.reload();
    });
  }

  function unpublish(userId: string) {
    setError(undefined);
    startTransition(async () => {
      const result = await adminUnpublishUserAction(userId, locale);
      if (!result.ok) setError(result.error);
      else window.location.reload();
    });
  }

  const visibleUsers = users.filter((user) => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return true;
    return [user.email, user.displayName].some((value) => value?.toLocaleLowerCase().includes(needle));
  });

  return (
    <div className="mx-auto max-w-5xl fade-in">
      <p className="eyebrow">{t.eyebrow}</p>
      <h1 className="display mt-2 text-4xl sm:text-5xl">{t.title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{t.intro}</p>
      {error && <p className="field-error mt-4">{error}</p>}
      <section className="mt-8">
        <h2 className="display text-2xl">{t.pending}</h2>
        {requests.length === 0 ? (
          <div className="card mt-4 p-6 text-sm text-[var(--muted)]">{t.none}</div>
        ) : (
          <div className="mt-4 space-y-4">
            {requests.map((request) => (
              <article key={request.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">{request.source === "family" ? (locale === "es" ? "Familiar" : "Family") : (locale === "es" ? "Pública" : "Public")}</p>
                    <h3 className="display mt-1 text-2xl">{request.targetDisplayName || request.targetEmail}</h3>
                    <p className="mt-1 text-sm text-[var(--muted)]">{request.targetEmail}</p>
                  </div>
                  <span className="pill">{request.relationship}</span>
                </div>
                <p className="mt-3 text-sm leading-6">{request.message}</p>
                <p className="mt-3 text-xs text-[var(--muted)]">{request.requesterName} · {request.requesterEmail}{request.deathDate ? ` · ${request.deathDate}` : ""}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button disabled={pending || !request.targetUserId} className="btn btn-primary" onClick={() => review(request.id, "approved")}>{pending && <LoaderCircle className="animate-spin" size={15} />}<Check size={15} />{t.approve}</button>
                  <button disabled={pending} className="btn btn-secondary" onClick={() => review(request.id, "rejected")}><X size={15} />{t.reject}</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="mt-12">
        <h2 className="display text-2xl">{locale === "es" ? "Cuentas" : "Accounts"}</h2>
        <div className="relative mt-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
          <input className="input !pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
        </div>
        <div className="mt-4 space-y-3">
          {visibleUsers.map((user) => (
            <article key={user.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="display text-xl">{user.displayName || user.email}</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">{user.email} · {user.entryCount} {t.moments}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {user.publicArchiveConsent && <span className="pill">{t.consent}</span>}
                    {user.publishedAt && <span className="pill">{t.published}</span>}
                    {user.deceasedAt && <span className="pill !bg-[#fff0e5] !text-[#8a5a3d]">{t.deceased}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {user.publishedAt ? (
                    <button disabled={pending} className="btn btn-secondary" onClick={() => unpublish(user.id)}>{t.unpublish}</button>
                  ) : (
                    <>
                      <button disabled={pending} className="btn btn-secondary" onClick={() => publish(user.id, false)}><Landmark size={15} />{t.publish}</button>
                      <button disabled={pending} className="btn btn-primary" onClick={() => publish(user.id, true)}><Shield size={15} />{t.publishDead}</button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
