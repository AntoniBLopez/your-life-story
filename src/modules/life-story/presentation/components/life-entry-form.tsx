"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, LoaderCircle, Paperclip, Sparkles } from "lucide-react";
import {
  CHANGE_DIRECTIONS,
  DATE_PRECISIONS,
  LIFE_AREAS,
  MOMENT_FLAGS,
  type LifeEntry,
  type LifeEntryLink,
  type ChangeDirection,
  type LifeArea,
  type MomentFlag,
} from "@/modules/life-story/domain/life-entry";
import {
  createLifeEntryAction,
  updateLifeEntryAction,
  uploadAttachmentAction,
} from "@/modules/life-story/application/life-entry-actions";
import type { EntryDictationOutput } from "@/modules/life-story/domain/entry-dictation-prompt";
import type { EntryReflectionOutput } from "@/modules/life-story/domain/entry-reflection-prompt";
import type { PendingVoiceNote, VoiceFieldKey } from "@/modules/life-story/domain/voice-note";
import type { AttachmentRecord } from "@/shared/lib/mongodb/attachments";
import { ExperienceDictationCard } from "@/modules/life-story/presentation/components/experience-dictation-card";
import { appendFieldTranscript, VoiceFieldRecorder } from "@/modules/life-story/presentation/components/voice-field-recorder";
import { VoiceAttachmentsList } from "@/modules/life-story/presentation/components/voice-attachments-list";

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

function FieldLabelWithVoice({
  label,
  locale,
  fieldKey,
  entryId,
  aiConsented,
  disabled,
  onTranscript,
  onPendingVoiceNote,
  onVoiceSaved,
  onError,
}: {
  label: string;
  locale: "es" | "en";
  fieldKey: VoiceFieldKey;
  entryId?: string;
  aiConsented: boolean;
  disabled?: boolean;
  onTranscript: (text: string) => void;
  onPendingVoiceNote: (note: PendingVoiceNote) => void;
  onVoiceSaved: () => void;
  onError: (message: string) => void;
}) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <span className="field-label !mb-0">{label}</span>
      <VoiceFieldRecorder
        locale={locale}
        fieldKey={fieldKey}
        entryId={entryId}
        aiConsented={aiConsented}
        disabled={disabled}
        compact
        onTranscript={onTranscript}
        onPendingVoiceNote={onPendingVoiceNote}
        onVoiceSaved={onVoiceSaved}
        onError={onError}
      />
    </div>
  );
}

export function LifeEntryForm({
  locale,
  entry,
  entries,
  link,
  aiConsented,
  attachments = [],
}: {
  locale: "es" | "en";
  entry?: LifeEntry;
  entries: LifeEntry[];
  link?: LifeEntryLink | null;
  aiConsented: boolean;
  attachments?: AttachmentRecord[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>();
  const [uploadMessage, setUploadMessage] = useState<string>();
  const [title, setTitle] = useState(entry?.title ?? "");
  const [narrative, setNarrative] = useState(entry?.narrative ?? "");
  const [difficulty, setDifficulty] = useState(entry?.difficulty ?? "");
  const [learning, setLearning] = useState(entry?.learning ?? "");
  const [transformation, setTransformation] = useState(entry?.transformation ?? "");
  const [lifeAreas, setLifeAreas] = useState<LifeArea[]>(
    entry?.lifeAreas?.length ? entry.lifeAreas : entry?.lifeArea ? [entry.lifeArea] : [],
  );
  const [changeDirection, setChangeDirection] = useState<ChangeDirection>(entry?.changeDirection ?? "neutral");
  const [momentFlags, setMomentFlags] = useState<MomentFlag[]>(entry?.momentFlags ?? []);
  const [tags, setTags] = useState(entry?.tags.join(", ") ?? "");
  const [pendingVoiceNotes, setPendingVoiceNotes] = useState<PendingVoiceNote[]>([]);
  const isEdit = Boolean(entry);
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
        uploaded: "Archivo guardado.",
        save: isEdit ? "Guardar cambios" : "Guardar experiencia",
        cancel: "Volver a mi historia",
        generateAi: "Generar con IA",
        generateAiHelp: "A partir de «Qué ocurrió», rellena automáticamente las áreas de vida, cómo lo sentiste, tipos de momento, reflexiones, etiquetas y qué cambió.",
        generateAiLoading: "Generando…",
        generateError: "No se pudo generar la reflexión.",
        consentRequired: "Activa el consentimiento de IA en Reflexionar o Ajustes para usar esta función.",
        narrativeTooShort: "Escribe al menos unas líneas en «Qué ocurrió» antes de generar.",
        voiceSaved: "Nota de voz guardada.",
        attachmentsBody: "JPG, PNG, WEBP, PDF o audio, hasta 15 MB. Se guardan al elegir el archivo o al dictar.",
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
        uploaded: "File saved.",
        save: isEdit ? "Save changes" : "Save experience",
        cancel: "Back to my story",
        generateAi: "Generate with AI",
        generateAiHelp: "From «What happened», automatically fill life areas, how it felt, moment types, reflections, tags and what changed.",
        generateAiLoading: "Generating…",
        generateError: "Could not generate the reflection.",
        consentRequired: "Enable AI consent in Reflect or Settings to use this feature.",
        narrativeTooShort: "Write at least a few lines in «What happened» before generating.",
        voiceSaved: "Voice note saved.",
        attachmentsBody: "JPG, PNG, WEBP, PDF or audio, up to 15 MB. Files are saved when you choose them or dictate.",
      };

  function queueVoiceNote(note: PendingVoiceNote) {
    setPendingVoiceNotes((current) => [...current, note]);
    setUploadMessage(t.voiceSaved);
  }

  function applyDictation(fields: EntryDictationOutput) {
    if (fields.title) setTitle(fields.title);
    if (fields.narrative) setNarrative(fields.narrative);
    if (fields.difficulty) setDifficulty(fields.difficulty);
    if (fields.learning) setLearning(fields.learning);
    if (fields.transformation) setTransformation(fields.transformation);
  }

  function applyReflection(fields: EntryReflectionOutput) {
    if (fields.difficulty) setDifficulty(fields.difficulty);
    if (fields.learning) setLearning(fields.learning);
    if (fields.transformation) setTransformation(fields.transformation);
    setChangeDirection(fields.changeDirection);
    setLifeAreas(fields.lifeAreas);
    setMomentFlags(fields.momentFlags);
    setTags(fields.tags.join(", "));
  }

  function toggleLifeArea(area: LifeArea) {
    setLifeAreas((current) => (
      current.includes(area) ? current.filter((value) => value !== area) : [...current, area]
    ));
  }

  function toggleMomentFlag(flag: MomentFlag) {
    setMomentFlags((current) => (
      current.includes(flag) ? current.filter((value) => value !== flag) : [...current, flag]
    ));
  }

  function submit(formData: FormData) {
    setError(undefined);
    setFieldErrors(undefined);
    formData.set("locale", locale);
    formData.delete("lifeAreas");
    lifeAreas.forEach((area) => formData.append("lifeAreas", area));
    formData.delete("momentFlags");
    momentFlags.forEach((flag) => formData.append("momentFlags", flag));
    formData.set("changeDirection", changeDirection);
    formData.set("tags", tags);
    startTransition(async () => {
      const result = entry
        ? await updateLifeEntryAction(entry.id, formData)
        : await createLifeEntryAction(formData);
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors);
        return;
      }

      const entryId = result.data?.id ?? entry?.id;
      if (entryId && pendingVoiceNotes.length > 0) {
        for (const note of pendingVoiceNotes) {
          const uploadResult = await uploadAttachmentAction({
            entryId,
            fileName: note.fileName,
            contentType: note.contentType,
            size: note.size,
            fileBase64: note.fileBase64,
            fieldKey: note.fieldKey,
            transcript: note.transcript,
          });
          if (!uploadResult.ok) {
            setError(uploadResult.error);
            return;
          }
        }
        setPendingVoiceNotes([]);
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

  async function generateReflection() {
    const trimmedNarrative = narrative.trim();
    if (trimmedNarrative.length < 20) {
      setError(t.narrativeTooShort);
      return;
    }
    if (!aiConsented) {
      setError(t.consentRequired);
      return;
    }

    setGenerating(true);
    setError(undefined);
    try {
      const response = await fetch("/api/ai/entry-reflection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narrative: trimmedNarrative, title, locale }),
      });
      const data = await response.json().catch(() => ({})) as EntryReflectionOutput & { error?: string };
      if (!response.ok) {
        setError(data.error ?? t.generateError);
        return;
      }
      applyReflection(data);
    } catch {
      setError(t.generateError);
    } finally {
      setGenerating(false);
    }
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
        <ExperienceDictationCard
          locale={locale}
          entryId={entry?.id}
          aiConsented={aiConsented}
          disabled={pending || generating}
          onFields={applyDictation}
          onPendingVoiceNote={queueVoiceNote}
          onVoiceSaved={() => router.refresh()}
          onError={setError}
        />

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
          <FieldLabelWithVoice
            label={t.name}
            locale={locale}
            fieldKey="title"
            entryId={entry?.id}
            aiConsented={aiConsented}
            disabled={pending || generating}
            onTranscript={(text) => setTitle((current) => appendFieldTranscript(current, text))}
            onPendingVoiceNote={queueVoiceNote}
            onVoiceSaved={() => router.refresh()}
            onError={setError}
          />
          <input className="input" name="title" required minLength={2} maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} />
          {fieldErrors?.title && <p className="field-error">{fieldErrors.title[0]}</p>}
        </label>

        <label>
          <FieldLabelWithVoice
            label={t.narrative}
            locale={locale}
            fieldKey="narrative"
            entryId={entry?.id}
            aiConsented={aiConsented}
            disabled={pending || generating}
            onTranscript={(text) => setNarrative((current) => appendFieldTranscript(current, text))}
            onPendingVoiceNote={queueVoiceNote}
            onVoiceSaved={() => router.refresh()}
            onError={setError}
          />
          <textarea className="textarea" name="narrative" maxLength={4000} value={narrative} onChange={(event) => setNarrative(event.target.value)} />
        </label>

        <div className="rounded-2xl border border-[var(--line)] bg-[#fcfdf9] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-[var(--muted)]">{t.generateAiHelp}</p>
            <button
              type="button"
              className="btn btn-secondary shrink-0"
              disabled={pending || generating || narrative.trim().length < 20}
              onClick={() => void generateReflection()}
            >
              {generating ? <LoaderCircle className="animate-spin" size={16} /> : <Sparkles size={16} />}
              {generating ? t.generateAiLoading : t.generateAi}
            </button>
          </div>
        </div>

        <fieldset>
          <legend className="field-label">{t.areas}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {LIFE_AREAS.map((value) => (
              <label key={value} className="pill cursor-pointer gap-2 !px-3 !py-2">
                <input
                  type="checkbox"
                  name="lifeAreas"
                  value={value}
                  checked={lifeAreas.includes(value)}
                  onChange={() => toggleLifeArea(value)}
                />
                {AREA_LABELS[locale][value]}
              </label>
            ))}
          </div>
          {fieldErrors?.lifeAreas && <p className="field-error">{fieldErrors.lifeAreas[0]}</p>}
        </fieldset>

        <label>
          <span className="field-label">{t.direction}</span>
          <select
            className="select"
            name="changeDirection"
            value={changeDirection}
            onChange={(event) => setChangeDirection(event.target.value as ChangeDirection)}
          >
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
                <input
                  type="checkbox"
                  name="momentFlags"
                  value={value}
                  checked={momentFlags.includes(value)}
                  onChange={() => toggleMomentFlag(value)}
                />
                {MOMENT_LABELS[locale][value]}
              </label>
            ))}
          </div>
        </fieldset>

        <label>
          <FieldLabelWithVoice
            label={t.difficulty}
            locale={locale}
            fieldKey="difficulty"
            entryId={entry?.id}
            aiConsented={aiConsented}
            disabled={pending || generating}
            onTranscript={(text) => setDifficulty((current) => appendFieldTranscript(current, text))}
            onPendingVoiceNote={queueVoiceNote}
            onVoiceSaved={() => router.refresh()}
            onError={setError}
          />
          <textarea className="textarea !min-h-24" name="difficulty" maxLength={4000} value={difficulty} onChange={(event) => setDifficulty(event.target.value)} />
        </label>
        <label>
          <FieldLabelWithVoice
            label={t.learning}
            locale={locale}
            fieldKey="learning"
            entryId={entry?.id}
            aiConsented={aiConsented}
            disabled={pending || generating}
            onTranscript={(text) => setLearning((current) => appendFieldTranscript(current, text))}
            onPendingVoiceNote={queueVoiceNote}
            onVoiceSaved={() => router.refresh()}
            onError={setError}
          />
          <textarea className="textarea !min-h-24" name="learning" maxLength={4000} value={learning} onChange={(event) => setLearning(event.target.value)} />
        </label>
        <label>
          <FieldLabelWithVoice
            label={t.transformation}
            locale={locale}
            fieldKey="transformation"
            entryId={entry?.id}
            aiConsented={aiConsented}
            disabled={pending || generating}
            onTranscript={(text) => setTransformation((current) => appendFieldTranscript(current, text))}
            onPendingVoiceNote={queueVoiceNote}
            onVoiceSaved={() => router.refresh()}
            onError={setError}
          />
          <textarea className="textarea !min-h-24" name="transformation" maxLength={4000} value={transformation} onChange={(event) => setTransformation(event.target.value)} />
        </label>

        <label>
          <span className="field-label">{t.tags}</span>
          <input className="input" name="tags" maxLength={400} value={tags} onChange={(event) => setTags(event.target.value)} placeholder={t.tagsHint} />
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
          <button disabled={pending || generating} className="btn btn-primary" type="submit">
            {pending ? <LoaderCircle className="animate-spin" size={16} /> : null}
            {t.save}
          </button>
          <Link className="btn btn-quiet" href={`/${locale}/app`}>{t.cancel}</Link>
        </div>
      </form>

      {(entry || pendingVoiceNotes.length > 0) && (
        <section className="card mt-5 p-5 sm:p-7">
          <h2 className="display text-2xl">{t.attachments}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{t.attachmentsBody}</p>
          {attachments.length > 0 && (
            <div className="mt-5">
              <VoiceAttachmentsList locale={locale} attachments={attachments} />
            </div>
          )}
          {entry && (
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
          )}
          {uploadMessage && <p className="mt-3 rounded-xl bg-[#edf5ec] p-3 text-sm text-[var(--moss-deep)]">{uploadMessage}</p>}
        </section>
      )}
    </div>
  );
}
