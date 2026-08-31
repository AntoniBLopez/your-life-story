"use client";

import { useState, useTransition } from "react";
import { Download, Globe, Landmark, LoaderCircle, ShieldAlert, Trash2, UsersRound } from "lucide-react";
import { deleteAccountAction, exportAccountDataAction } from "@/modules/identity/application/account-actions";
import { revokeAiConsentAction } from "@/modules/reflection/application/reflection-actions";
import { setPublicArchiveConsentAction, submitDeathDeclarationAction } from "@/modules/archive/application/archive-actions";

type Props = {
  locale: "es" | "en";
  aiConsented: boolean;
  publicArchiveConsent: boolean;
  archiveSlug: string | null;
  published: boolean;
  deceased: boolean;
  displayName: string;
  email: string;
};

export function AccountSettings({ locale, aiConsented, publicArchiveConsent, archiveSlug, published, deceased, displayName, email }: Props) {
  const [pending, startTransition] = useTransition();
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [isPublic, setIsPublic] = useState(publicArchiveConsent && published);
  const [slug, setSlug] = useState(archiveSlug);
  const [deathSent, setDeathSent] = useState(false);
  const t = locale === "es"
    ? {
        eyebrow: "Control de datos",
        title: "Ajustes y privacidad",
        intro: "Tu historia es tuya. Aquí decides si se publica, puedes llevártela contigo o eliminarla.",
        archive: "Archivo público",
        archiveBody: "Si lo activas, toda tu historia —experiencias, aprendizajes, familia y archivos— podrá verse y estudiarse en el archivo público, también con IA. Puedes desactivarlo cuando quieras, salvo si ya has sido marcada como fallecida.",
        archiveOn: "Publicar mi vida en el archivo",
        archiveOff: "Dejar de publicar",
        archiveLive: "Tu vida está en el archivo público.",
        archiveView: "Ver mi perfil público",
        deceasedNote: "Esta cuenta está marcada como fallecida. Un administrador gestiona su publicación.",
        death: "Declarar un fallecimiento",
        deathBody: "Si un familiar o alguien cercano ha muerto y tenía cuenta aquí, puedes pedirnos que revisemos publicar su vida y marcarla como fallecida.",
        deathName: "Tu nombre",
        deathEmail: "Tu email",
        deathTarget: "Email de la persona fallecida",
        deathRelation: "Tu relación",
        deathDate: "Fecha de fallecimiento",
        deathMessage: "Contexto para la revisión",
        deathSend: "Enviar declaración",
        deathSent: "Hemos recibido la declaración. Un administrador la revisará.",
        export: "Exportar mis datos",
        exportBody: "Descarga un archivo JSON con tus experiencias, conexiones, genealogía, conversaciones y metadatos de adjuntos.",
        ai: "Consentimiento de IA",
        aiBody: "Puedes retirar el permiso de enviar el texto de tus experiencias al asistente en cualquier momento.",
        revoke: "Retirar consentimiento",
        danger: "Eliminar mi cuenta",
        dangerBody: "Borrará de forma irreversible tu cuenta, experiencias, conversaciones, familia y archivos. Escribe DELETE para confirmar.",
        remove: "Eliminar definitivamente",
        exported: "La exportación se ha descargado.",
        revoked: "El consentimiento de IA se ha retirado.",
        deleted: "Cuenta eliminada.",
        published: "Tu vida se ha publicado en el archivo.",
        unpublished: "Tu vida ya no es pública.",
      }
    : {
        eyebrow: "Data control",
        title: "Settings and privacy",
        intro: "Your story is yours. Here you decide whether it is published, take it with you or delete it.",
        archive: "Public archive",
        archiveBody: "If you turn this on, your whole story —experiences, lessons, family and files— can be viewed and studied in the public archive, including with AI. You can turn it off at any time, unless you have already been marked as deceased.",
        archiveOn: "Publish my life in the archive",
        archiveOff: "Stop publishing",
        archiveLive: "Your life is in the public archive.",
        archiveView: "View my public profile",
        deceasedNote: "This account is marked as deceased. An administrator manages its publication.",
        death: "Declare a death",
        deathBody: "If a relative or someone close has died and had an account here, you can ask us to review publishing their life and marking them as deceased.",
        deathName: "Your name",
        deathEmail: "Your email",
        deathTarget: "Email of the deceased person",
        deathRelation: "Your relationship",
        deathDate: "Date of death",
        deathMessage: "Context for the review",
        deathSend: "Send declaration",
        deathSent: "We have received the declaration. An administrator will review it.",
        export: "Export my data",
        exportBody: "Download a JSON file with your experiences, connections, family tree, conversations and attachment metadata.",
        ai: "AI consent",
        aiBody: "You can withdraw permission to send the text of your experiences to the assistant at any time.",
        revoke: "Withdraw consent",
        danger: "Delete my account",
        dangerBody: "This permanently erases your account, experiences, chats, family tree and files. Type DELETE to confirm.",
        remove: "Delete permanently",
        exported: "Your export has downloaded.",
        revoked: "AI consent has been withdrawn.",
        deleted: "Account deleted.",
        published: "Your life has been published in the archive.",
        unpublished: "Your life is no longer public.",
      };

  function exportData() {
    setError(undefined);
    startTransition(async () => {
      const result = await exportAccountDataAction();
      if (!result.ok) { setError(result.error); return; }
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = `your-life-story-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(href);
      setMessage(t.exported);
    });
  }

  function revoke() {
    setError(undefined);
    startTransition(async () => {
      const result = await revokeAiConsentAction(locale);
      if (!result.ok) setError(result.error);
      else setMessage(t.revoked);
    });
  }

  function toggleArchive() {
    setError(undefined);
    startTransition(async () => {
      const result = await setPublicArchiveConsentAction(!isPublic, locale);
      if (!result.ok) { setError(result.error); return; }
      setIsPublic(!isPublic);
      setSlug(result.data.slug);
      setMessage(!isPublic ? t.published : t.unpublished);
    });
  }

  function declareDeath(formData: FormData) {
    setError(undefined);
    formData.set("locale", locale);
    startTransition(async () => {
      const result = await submitDeathDeclarationAction(formData);
      if (!result.ok) setError(result.error);
      else setDeathSent(true);
    });
  }

  function remove() {
    setError(undefined);
    if (!window.confirm(t.dangerBody)) return;
    startTransition(async () => {
      const result = await deleteAccountAction(confirmation, locale);
      if (!result.ok) setError(result.error);
      else {
        setMessage(t.deleted);
        window.location.assign(`/${locale}`);
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl fade-in">
      <p className="eyebrow">{t.eyebrow}</p>
      <h1 className="display mt-2 text-4xl sm:text-5xl">{t.title}</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{t.intro}</p>
      <div className="mt-8 space-y-5">
        <section className="card p-6">
          <Landmark className="text-[var(--moss)]" size={21} />
          <h2 className="display mt-3 text-2xl">{t.archive}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{t.archiveBody}</p>
          {deceased ? (
            <p className="mt-5 rounded-xl bg-[#fff0e5] p-3 text-sm text-[#8a5a3d]">{t.deceasedNote}</p>
          ) : (
            <button disabled={pending} className={`btn mt-5 ${isPublic ? "btn-secondary" : "btn-primary"}`} onClick={toggleArchive}>
              {pending && <LoaderCircle className="animate-spin" size={15} />}
              <Globe size={15} />
              {isPublic ? t.archiveOff : t.archiveOn}
            </button>
          )}
          {isPublic && slug && (
            <p className="mt-4 text-sm">
              {t.archiveLive}{" "}
              <a className="font-bold text-[var(--moss)] underline" href={`/${locale}/archive/${slug}`}>{t.archiveView}</a>
            </p>
          )}
        </section>
        <section className="card p-6">
          <UsersRound className="text-[var(--moss)]" size={21} />
          <h2 className="display mt-3 text-2xl">{t.death}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{t.deathBody}</p>
          {deathSent ? (
            <p className="mt-5 rounded-xl bg-[#edf5ec] p-3 text-sm text-[var(--moss-deep)]">{t.deathSent}</p>
          ) : (
            <form action={declareDeath} className="mt-5 grid gap-4">
              <label><span className="field-label">{t.deathName}</span><input className="input" name="requesterName" required minLength={2} defaultValue={displayName} /></label>
              <label><span className="field-label">{t.deathEmail}</span><input className="input" name="requesterEmail" type="email" required defaultValue={email} /></label>
              <label><span className="field-label">{t.deathTarget}</span><input className="input" name="targetEmail" type="email" required /></label>
              <label><span className="field-label">{t.deathRelation}</span><input className="input" name="relationship" required minLength={2} /></label>
              <label><span className="field-label">{t.deathDate}</span><input className="input" name="deathDate" type="date" /></label>
              <label><span className="field-label">{t.deathMessage}</span><textarea className="textarea !min-h-24" name="message" required minLength={10} /></label>
              <button disabled={pending} className="btn btn-primary sm:w-fit">{pending && <LoaderCircle className="animate-spin" size={15} />}{t.deathSend}</button>
            </form>
          )}
        </section>
        <section className="card p-6">
          <Download className="text-[var(--moss)]" size={21} />
          <h2 className="display mt-3 text-2xl">{t.export}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{t.exportBody}</p>
          <button disabled={pending} className="btn btn-secondary mt-5" onClick={exportData}>{pending && <LoaderCircle className="animate-spin" size={15} />}<Download size={15} />{t.export}</button>
        </section>
        <section className="card p-6">
          <ShieldAlert className="text-[var(--moss)]" size={21} />
          <h2 className="display mt-3 text-2xl">{t.ai}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{t.aiBody}</p>
          {aiConsented ? <button disabled={pending} className="btn btn-secondary mt-5" onClick={revoke}>{t.revoke}</button> : <span className="pill mt-5">{locale === "es" ? "No hay consentimiento activo" : "No active consent"}</span>}
        </section>
        <section className="card border-[#edcfcb] p-6">
          <Trash2 className="text-[var(--danger)]" size={21} />
          <h2 className="display mt-3 text-2xl">{t.danger}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{t.dangerBody}</p>
          <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="input mt-5 max-w-sm" placeholder="DELETE" />
          <button disabled={pending || confirmation !== "DELETE"} className="btn btn-danger mt-4" onClick={remove}>{pending && <LoaderCircle className="animate-spin" size={15} />}<Trash2 size={15} />{t.remove}</button>
        </section>
        {error && <p className="field-error">{error}</p>}
        {message && <p className="rounded-xl bg-[#edf5ec] p-3 text-sm text-[var(--moss-deep)]">{message}</p>}
      </div>
    </div>
  );
}
