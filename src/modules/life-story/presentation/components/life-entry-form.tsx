"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, LoaderCircle, Paperclip } from "lucide-react";
import {
  CHANGE_DIRECTIONS,
  DATE_PRECISIONS,
  LIFE_AREAS,
  MOMENT_FLAGS,
  type LifeEntry,
  type LifeEntryLink,
} from "@/modules/life-story/domain/life-entry";
import {
  createLifeEntryAction,
  updateLifeEntryAction,
  uploadAttachmentAction,
} from "@/modules/life-story/application/life-entry-actions";

const AREA_LABELS = {
  es: {
    general: "En general",
    health: "Salud",
    relationships: "Relaciones",
    work: "Trabajo",
    education: "Educación",
    home: "Hogar",
    identity: "Identidad",
    finances: "Finanzas",
    other: "Otra",
  },
  en: {
    general: "General",
    health: "Health",
    relationships: "Relationships",
    work: "Work",
    education: "Education",
    home: "Home",
    identity: "Identity",
    finances: "Finances",
    other: "Other",
  },
} as const;

const DIRECTION_LABELS = {
  es: { improved: "Mejoró", difficult: "Fue difícil", mixed: "Mixto", neutral: "Neutro" },
  en: { improved: "Improved", difficult: "Difficult", mixed: "Mixed", neutral: "Neutral" },
} as const;

const MOMENT_LABELS = {
  es: { critical: "Momento crítico", inflection: "Punto de inflexión", turning_point: "Giro vital" },
  en: { critical: "Critical moment", inflection: "Inflection point", turning_point: "Turning point" },
} as const;

const PRECISION_LABELS = {
  es: { day: "Día exacto", month: "Mes", year: "Año" },
  en: { day: "Exact day", month: "Month", year: "Year" },
} as const;

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

export function LifeEntryForm({
  locale,
  entry,
  entries,
  link,
}: {
  locale: "es" | "en";
  entry?: LifeEntry;
  entries: LifeEntry[];
  link?: LifeEntryLink | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>();
  const [uploadMessage, setUploadMessage] = useState<string>();
  const isEdit = Boolean(entry);
  const selectedAreas = entry?.lifeAreas?.length ? entry.lifeAreas : entry?.lifeArea ? [entry.lifeArea] : [];
  const otherEntries = entries.filter((item) => item.id !== entry?.id);
  const t = locale === "es"
    ? {
        eyebrow: isEdit ? "Editar" : "Nueva experiencia",
        title: isEdit ? "Revisa este momento" : "Añade un momento",
        body: isEdit
          ? "Ajusta fechas, áreas o lo que hayas aprendido. Los cambios se guardan en tu historia."
          : "Empieza por una fecha y un título. El resto puedes completarlo cuando quieras.",
        start: "Fecha de inicio",
        end: "Fecha de fin (opcional)",
        precision: "Precisión de la fecha",
        name: "Título",
        narrative: "Qué ocurrió",
        areas: "Áreas de vida",
        direction: "Cómo lo sentiste",
        moments: "Tipo de momento",
        difficulty: "Qué fue difícil",
        learning: "Qué aprendiste",
        transformation: "Qué cambió",
        tags: "Etiquetas",
        tagsHint: "Separa con comas, por ejemplo familia, trabajo",
        link: "Relacionar con otra experiencia",
        none: "Sin relación",
        linkType: "Tipo de relación",
        related: "Relacionada",
        consequence: "Consecuencia",
        attachments: "Adjuntos",
        attachmentsBody: "JPG, PNG, WEBP o PDF, hasta 10 MB. Se guardan al elegir el archivo.",
        uploaded: "Archivo guardado.",
        save: isEdit ? "Guardar cambios" : "Guardar experiencia",
        cancel: "Volver a mi historia",
      }
    : {
        eyebrow: isEdit ? "Edit" : "New experience",
        title: isEdit ? "Revisit this moment" : "Add a moment",
        body: isEdit
          ? "Adjust dates, areas or what you learned. Changes are saved to your story."
          : "Start with a date and a title. You can fill in the rest whenever you like.",
        start: "Start date",
        end: "End date (optional)",
        precision: "Date precision",
        name: "Title",
        narrative: "What happened",
        areas: "Life areas",
        direction: "How it felt",
        moments: "Moment type",
        difficulty: "What was hard",
        learning: "What you learned",
        transformation: "What changed",
        tags: "Tags",
        tagsHint: "Separate with commas, for example family, work",
        link: "Link to another experience",
        none: "No link",
        linkType: "Link type",
        related: "Related",
        consequence: "Consequence",
        attachments: "Attachments",
        attachmentsBody: "JPG, PNG, WEBP or PDF, up to 10 MB. Files are saved when you choose them.",
        uploaded: "File saved.",
        save: isEdit ? "Save changes" : "Save experience",
        cancel: "Back to my story",
      };

  function submit(formData: FormData) {
    setError(undefined);
    setFieldErrors(undefined);
    formData.set("locale", locale);
    startTransition(async () => {
      const result = entry
        ? await updateLifeEntryAction(entry.id, formData)
        : await createLifeEntryAction(formData);
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors);
        return;
      }
      router.push(`/${locale}/app`);
      router.refresh();
    });
  }

  function upload(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file || !entry) return;
    setError(undefined);
    setUploadMessage(undefined);
    startTransition(async () => {
      try {
        const result = await uploadAttachmentAction({
          entryId: entry.id,
          fileName: file.name,
          contentType: file.type as "image/jpeg" | "image/png" | "image/webp" | "application/pdf",
          size: file.size,
          fileBase64: await fileToBase64(file),
        });
        if (!result.ok) setError(result.error);
        else setUploadMessage(t.uploaded);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : t.attachmentsBody);
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl fade-in">
      <Link href={`/${locale}/app`} className="btn btn-quiet !px-0 text-sm">
        <ArrowLeft size={15} />
        {t.cancel}
      </Link>
      <p className="eyebrow mt-6">{t.eyebrow}</p>
      <h1 className="display mt-2 text-4xl sm:text-5xl">{t.title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{t.body}</p>

      <form action={submit} className="card mt-8 space-y-5 p-5 sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="field-label">{t.start}</span>
            <input className="input" type="date" name="startDate" required defaultValue={entry?.startDate ?? ""} />
            {fieldErrors?.startDate && <p className="field-error">{fieldErrors.startDate[0]}</p>}
          </label>
          <label>
            <span className="field-label">{t.end}</span>
            <input className="input" type="date" name="endDate" defaultValue={entry?.endDate ?? ""} />
            {fieldErrors?.endDate && <p className="field-error">{fieldErrors.endDate[0]}</p>}
          </label>
        </div>

        <label>
          <span className="field-label">{t.precision}</span>
          <select className="select" name="datePrecision" defaultValue={entry?.datePrecision ?? "day"}>
            {DATE_PRECISIONS.map((value) => (
              <option key={value} value={value}>{PRECISION_LABELS[locale][value]}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="field-label">{t.name}</span>
          <input className="input" name="title" required minLength={2} maxLength={160} defaultValue={entry?.title ?? ""} />
          {fieldErrors?.title && <p className="field-error">{fieldErrors.title[0]}</p>}
        </label>

        <label>
          <span className="field-label">{t.narrative}</span>
          <textarea className="textarea" name="narrative" maxLength={4000} defaultValue={entry?.narrative ?? ""} />
        </label>

        <fieldset>
          <legend className="field-label">{t.areas}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {LIFE_AREAS.map((value) => (
              <label key={value} className="pill cursor-pointer gap-2 !px-3 !py-2">
                <input type="checkbox" name="lifeAreas" value={value} defaultChecked={selectedAreas.includes(value)} />
                {AREA_LABELS[locale][value]}
              </label>
            ))}
          </div>
          {fieldErrors?.lifeAreas && <p className="field-error">{fieldErrors.lifeAreas[0]}</p>}
        </fieldset>

        <label>
          <span className="field-label">{t.direction}</span>
          <select className="select" name="changeDirection" defaultValue={entry?.changeDirection ?? "neutral"}>
            {CHANGE_DIRECTIONS.map((value) => (
              <option key={value} value={value}>{DIRECTION_LABELS[locale][value]}</option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend className="field-label">{t.moments}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {MOMENT_FLAGS.map((value) => (
              <label key={value} className="pill cursor-pointer gap-2 !px-3 !py-2">
                <input type="checkbox" name="momentFlags" value={value} defaultChecked={entry?.momentFlags?.includes(value)} />
                {MOMENT_LABELS[locale][value]}
              </label>
            ))}
          </div>
        </fieldset>

        <label>
          <span className="field-label">{t.difficulty}</span>
          <textarea className="textarea !min-h-24" name="difficulty" maxLength={4000} defaultValue={entry?.difficulty ?? ""} />
        </label>
        <label>
          <span className="field-label">{t.learning}</span>
          <textarea className="textarea !min-h-24" name="learning" maxLength={4000} defaultValue={entry?.learning ?? ""} />
        </label>
        <label>
          <span className="field-label">{t.transformation}</span>
          <textarea className="textarea !min-h-24" name="transformation" maxLength={4000} defaultValue={entry?.transformation ?? ""} />
        </label>

        <label>
          <span className="field-label">{t.tags}</span>
          <input className="input" name="tags" maxLength={400} defaultValue={entry?.tags.join(", ") ?? ""} placeholder={t.tagsHint} />
        </label>

        {otherEntries.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="field-label">{t.link}</span>
              <select className="select" name="linkedEntryId" defaultValue={link?.targetEntryId ?? ""}>
                <option value="">{t.none}</option>
                {otherEntries.map((item) => (
                  <option key={item.id} value={item.id}>{item.title}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">{t.linkType}</span>
              <select className="select" name="linkType" defaultValue={link?.relation ?? "related"}>
                <option value="related">{t.related}</option>
                <option value="consequence">{t.consequence}</option>
              </select>
            </label>
          </div>
        )}

        {error && <p role="alert" className="field-error">{error}</p>}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button disabled={pending} className="btn btn-primary" type="submit">
            {pending ? <LoaderCircle className="animate-spin" size={16} /> : null}
            {t.save}
          </button>
          <Link className="btn btn-quiet" href={`/${locale}/app`}>{t.cancel}</Link>
        </div>
      </form>

      {entry && (
        <section className="card mt-5 p-5 sm:p-7">
          <h2 className="display text-2xl">{t.attachments}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{t.attachmentsBody}</p>
          <label className="btn btn-secondary mt-5 w-fit cursor-pointer">
            <Paperclip size={15} />
            {locale === "es" ? "Añadir archivo" : "Add file"}
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              disabled={pending}
              onChange={(event) => {
                upload(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
          {uploadMessage && <p className="mt-3 rounded-xl bg-[#edf5ec] p-3 text-sm text-[var(--moss-deep)]">{uploadMessage}</p>}
        </section>
      )}
    </div>
  );
}
