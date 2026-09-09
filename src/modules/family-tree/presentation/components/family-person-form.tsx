"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ImagePlus, Mars, Plus, Trash2, Venus, X } from "lucide-react";
import { deleteFamilyPersonAction } from "@/modules/family-tree/application/family-actions";
import { ConfirmDialog } from "@/modules/life-story/presentation/components/confirm-dialog";
import { canRemindBirthday, type BirthdayReminderOffset, type BirthdayReminderPreset } from "@/modules/family-tree/domain/birthday-reminder";
import { familyAvatarUrl, hasFamilyAvatar, parentCandidatesForRole, type FamilyPerson } from "@/modules/family-tree/domain/family-graph";
import { FamilyPersonReminderEdit, initialReminderOffsets, offsetsEqual } from "@/modules/family-tree/presentation/components/family-person-reminder-edit";
import { IMAGE_CONTENT_TYPES, resolveAttachmentContentType } from "@/modules/life-story/domain/attachment-content-type";
import { fileToBase64 } from "@/shared/lib/file-to-base64";

const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

type ParentSlots = { motherId: string | null; fatherId: string | null };

type FormState = {
  fullName: string;
  birthDate: string;
  deathDate: string;
  birthCountry: string;
  birthCity: string;
  gender: string;
  baptized: string;
  notes: string;
  email: string;
  canReadTimeline: boolean;
  isSubject: boolean;
  motherId: string;
  fatherId: string;
  birthdayReminderEnabled: boolean;
  offsets: BirthdayReminderOffset[];
};

function buildFormState(
  person?: FamilyPerson,
  parentSlots: ParentSlots = { motherId: null, fatherId: null },
  subject?: FamilyPerson,
  presets: BirthdayReminderPreset[] = [],
): FormState {
  return {
    fullName: person?.fullName ?? "",
    birthDate: person?.birthDate ?? "",
    deathDate: person?.deathDate ?? "",
    birthCountry: person?.birthCountry ?? "",
    birthCity: person?.birthCity ?? "",
    gender: person?.gender ?? "",
    baptized: person?.baptized === true ? "true" : person?.baptized === false ? "false" : "",
    notes: person?.notes ?? "",
    email: person?.email ?? "",
    canReadTimeline: Boolean(person?.canReadTimeline),
    isSubject: Boolean(person?.isSubject ?? !subject),
    motherId: parentSlots.motherId ?? "",
    fatherId: parentSlots.fatherId ?? "",
    birthdayReminderEnabled: Boolean(person?.birthdayReminderEnabled),
    offsets: initialReminderOffsets(person, presets),
  };
}

function formStatesEqual(a: FormState, b: FormState) {
  return a.fullName === b.fullName
    && a.birthDate === b.birthDate
    && a.deathDate === b.deathDate
    && a.birthCountry === b.birthCountry
    && a.birthCity === b.birthCity
    && a.gender === b.gender
    && a.baptized === b.baptized
    && a.notes === b.notes
    && a.email === b.email
    && a.canReadTimeline === b.canReadTimeline
    && a.isSubject === b.isSubject
    && a.motherId === b.motherId
    && a.fatherId === b.fatherId
    && a.birthdayReminderEnabled === b.birthdayReminderEnabled
    && offsetsEqual(a.offsets, b.offsets);
}

export function FamilyPersonForm({
  locale,
  person,
  subject,
  parentSlots,
  parentCandidates,
  presets,
  calendar,
  pending,
  onSubmit,
  onClose,
  onDeleted,
}: {
  locale: "es" | "en";
  person?: FamilyPerson;
  subject?: FamilyPerson;
  parentSlots: ParentSlots;
  parentCandidates: FamilyPerson[];
  presets: BirthdayReminderPreset[];
  calendar?: { connected: boolean; email: string | null };
  pending: boolean;
  onSubmit: (formData: FormData) => void;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const initial = useMemo(
    () => buildFormState(person, parentSlots, subject, presets),
    [person, parentSlots, subject, presets],
  );
  const [form, setForm] = useState(initial);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    person && hasFamilyAvatar(person) ? familyAvatarUrl(person.id) : null,
  );
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteError, setDeleteError] = useState<string>();
  const [deletePending, startDeleteTransition] = useTransition();
  const avatarDirty = Boolean(avatarFile) || (removeAvatar && Boolean(person && hasFamilyAvatar(person)));
  const isDirty = useMemo(() => avatarDirty || !formStatesEqual(form, initial), [avatarDirty, form, initial]);
  const showMeCheckbox = !subject || person?.isSubject;
  const showReminder = canRemindBirthday(form.birthDate) && !form.isSubject;
  const t = locale === "es"
    ? {
        person: "Añadir persona",
        edit: "Editar",
        close: "Cerrar",
        name: "Nombre completo",
        birth: "Nacimiento",
        death: "Fallecimiento",
        country: "País de nacimiento",
        city: "Ciudad de nacimiento",
        gender: "Género",
        genderMale: "Hombre",
        genderFemale: "Mujer",
        baptized: "Bautismo",
        baptizedUnknown: "No indicado",
        baptizedYes: "Bautizado/a",
        baptizedNo: "No bautizado/a",
        notes: "Notas",
        email: "Email",
        share: "Puede leer mi cronograma",
        shareHelp: "Si se registra con este email, verá tu historia en solo lectura porque forma parte de tu árbol.",
        me: "Esta persona soy yo",
        save: "Guardar persona",
        update: "Guardar cambios",
        mother: "Madre",
        father: "Padre",
        parentNone: "Sin asignar",
        parentsHelp: "Elige la madre y el padre de esta persona entre las personas ya añadidas al árbol.",
        photo: "Foto de perfil",
        addPhoto: "Añadir foto",
        changePhoto: "Cambiar foto",
        removePhoto: "Quitar foto",
        photoHelp: "Opcional. JPG, PNG o WebP, hasta 2 MB.",
        photoInvalid: "La imagen debe ser JPG, PNG o WebP.",
        photoTooLarge: "La imagen no puede superar 2 MB.",
        delete: "Eliminar persona",
        deleteTitle: "Eliminar persona",
        deleteBody: (name: string) => `Se eliminará a ${name} del árbol familiar junto con sus vínculos. Esta acción no se puede deshacer.`,
        deleteContinue: "Continuar",
        deleteFinalTitle: (name: string) => `¿Eliminar a ${name}?`,
        deleteFinalBody: "Se borrarán sus datos, vínculos y recordatorios de cumpleaños en Google Calendar si los tenía activos.",
        deleteConfirm: "Sí, eliminar persona",
        deleteBack: "Volver",
        deleteCancel: "Cancelar",
      }
    : {
        person: "Add person",
        edit: "Edit",
        close: "Close",
        name: "Full name",
        birth: "Birth",
        death: "Death",
        country: "Country of birth",
        city: "City of birth",
        gender: "Gender",
        genderMale: "Male",
        genderFemale: "Female",
        baptized: "Baptism",
        baptizedUnknown: "Not specified",
        baptizedYes: "Baptized",
        baptizedNo: "Not baptized",
        notes: "Notes",
        email: "Email",
        share: "Can read my timeline",
        shareHelp: "If they register with this email, they will see your story in read-only view because they are part of your tree.",
        me: "This person is me",
        save: "Save person",
        update: "Save changes",
        mother: "Mother",
        father: "Father",
        parentNone: "Not assigned",
        parentsHelp: "Choose this person's mother and father from people already in the tree.",
        photo: "Profile photo",
        addPhoto: "Add photo",
        changePhoto: "Change photo",
        removePhoto: "Remove photo",
        photoHelp: "Optional. JPG, PNG or WebP, up to 2 MB.",
        photoInvalid: "The image must be JPG, PNG or WebP.",
        photoTooLarge: "The image cannot be larger than 2 MB.",
        delete: "Delete person",
        deleteTitle: "Delete person",
        deleteBody: (name: string) => `${name} will be removed from the family tree along with their links. This cannot be undone.`,
        deleteContinue: "Continue",
        deleteFinalTitle: (name: string) => `Delete ${name}?`,
        deleteFinalBody: "Their data, relationships and Google Calendar birthday reminders (if enabled) will be removed.",
        deleteConfirm: "Yes, delete person",
        deleteBack: "Go back",
        deleteCancel: "Cancel",
      };

  useEffect(() => {
    setForm(initial);
    setAvatarFile(null);
    setRemoveAvatar(false);
    setAvatarError(undefined);
    setAvatarPreview(person && hasFamilyAvatar(person) ? familyAvatarUrl(person.id) : null);
  }, [initial, person]);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAvatarError(undefined);
    const formData = new FormData(event.currentTarget);
    if (removeAvatar) formData.set("removeAvatar", "true");
    if (avatarFile) {
      const contentType = resolveAttachmentContentType(avatarFile.name, avatarFile.type);
      if (!contentType || !IMAGE_CONTENT_TYPES.includes(contentType as (typeof IMAGE_CONTENT_TYPES)[number])) {
        setAvatarError(t.photoInvalid);
        return;
      }
      if (avatarFile.size > MAX_AVATAR_BYTES) {
        setAvatarError(t.photoTooLarge);
        return;
      }
      formData.set("avatarBase64", await fileToBase64(avatarFile));
      formData.set("avatarFileName", avatarFile.name);
      formData.set("avatarContentType", contentType);
      formData.set("avatarSize", String(avatarFile.size));
    }
    onSubmit(formData);
  }

  function handleAvatarSelect(file: File | null) {
    if (!file) return;
    setAvatarError(undefined);
    setRemoveAvatar(false);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function handleAvatarRemove() {
    setAvatarError(undefined);
    setAvatarFile(null);
    setRemoveAvatar(Boolean(person && hasFamilyAvatar(person)));
    setAvatarPreview(null);
  }

  function closeDeleteDialog() {
    if (deletePending) return;
    setDeleteOpen(false);
    setDeleteStep(1);
    setDeleteError(undefined);
  }

  function confirmDelete() {
    if (!person) return;
    setDeleteError(undefined);
    startDeleteTransition(async () => {
      const result = await deleteFamilyPersonAction(person.id, locale);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      closeDeleteDialog();
      onDeleted?.();
    });
  }

  const canSubmit = person ? isDirty : form.fullName.trim().length >= 2;
  const canDelete = Boolean(person && !person.isSubject);
  const motherCandidates = useMemo(
    () => parentCandidatesForRole(
      parentCandidates.filter((candidate) => candidate.id !== form.fatherId),
      "mother",
      form.motherId || null,
    ),
    [parentCandidates, form.fatherId, form.motherId],
  );
  const fatherCandidates = useMemo(
    () => parentCandidatesForRole(
      parentCandidates.filter((candidate) => candidate.id !== form.motherId),
      "father",
      form.fatherId || null,
    ),
    [parentCandidates, form.fatherId, form.motherId],
  );

  return (
    <section className="card mt-6 p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="display text-2xl">{person ? t.edit : t.person}</h2>
        <button type="button" aria-label={t.close} className="btn btn-quiet shrink-0 !p-1" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      <form key={person?.id ?? "new"} onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-3">
        <label className="md:col-span-2">
          <span className="field-label">{t.name}</span>
          <input className="input" name="fullName" required minLength={2} value={form.fullName} onChange={(event) => patch("fullName", event.target.value)} />
        </label>
        <div className="md:col-span-3">
          <span className="field-label">{t.photo}</span>
          <div className="flex flex-wrap items-center gap-3">
            {avatarPreview && (
              <img src={avatarPreview} alt="" className="family-person-avatar-preview" />
            )}
            <label className="btn btn-secondary cursor-pointer">
              <ImagePlus size={16} />
              {avatarPreview ? t.changePhoto : t.addPhoto}
              <input
                className="sr-only"
                type="file"
                accept={AVATAR_ACCEPT}
                onChange={(event) => {
                  handleAvatarSelect(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />
            </label>
            {avatarPreview && (
              <button type="button" className="btn btn-quiet" onClick={handleAvatarRemove}>
                {t.removePhoto}
              </button>
            )}
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{t.photoHelp}</p>
          {avatarError && <p className="field-error">{avatarError}</p>}
        </div>
        <div>
          <span className="field-label">{t.gender}</span>
          <input type="hidden" name="gender" value={form.gender} />
          <div className="family-gender-switch" role="group" aria-label={t.gender}>
            <button
              type="button"
              className="family-gender-switch-btn"
              data-gender="male"
              aria-pressed={form.gender === "male"}
              onClick={() => patch("gender", "male")}
            >
              <Mars size={16} />
              {t.genderMale}
            </button>
            <button
              type="button"
              className="family-gender-switch-btn"
              data-gender="female"
              aria-pressed={form.gender === "female"}
              onClick={() => patch("gender", "female")}
            >
              <Venus size={16} />
              {t.genderFemale}
            </button>
          </div>
        </div>
        {showMeCheckbox && (
          <label className="flex items-end gap-2 pb-3 text-sm font-bold">
            <input type="checkbox" name="isSubject" checked={form.isSubject} onChange={(event) => patch("isSubject", event.target.checked)} />
            {t.me}
          </label>
        )}
        <label>
          <span className="field-label">{t.birth}</span>
          <input type="date" className="input" name="birthDate" value={form.birthDate} onChange={(event) => patch("birthDate", event.target.value)} />
        </label>
        <label>
          <span className="field-label">{t.death}</span>
          <input type="date" className="input" name="deathDate" value={form.deathDate} onChange={(event) => patch("deathDate", event.target.value)} />
        </label>
        <label>
          <span className="field-label">{t.country}</span>
          <input className="input" name="birthCountry" value={form.birthCountry} onChange={(event) => patch("birthCountry", event.target.value)} />
        </label>
        <label>
          <span className="field-label">{t.city}</span>
          <input className="input" name="birthCity" value={form.birthCity} onChange={(event) => patch("birthCity", event.target.value)} />
        </label>
        <label>
          <span className="field-label">{t.baptized}</span>
          <select className="select" name="baptized" value={form.baptized} onChange={(event) => patch("baptized", event.target.value)}>
            <option value="">{t.baptizedUnknown}</option>
            <option value="true">{t.baptizedYes}</option>
            <option value="false">{t.baptizedNo}</option>
          </select>
        </label>
        {parentCandidates.length > 0 && (
          <>
            <label>
              <span className="field-label">{t.mother}</span>
              <select className="select" name="motherId" value={form.motherId} onChange={(event) => patch("motherId", event.target.value)}>
                <option value="">{t.parentNone}</option>
                {motherCandidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>{candidate.fullName}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">{t.father}</span>
              <select className="select" name="fatherId" value={form.fatherId} onChange={(event) => patch("fatherId", event.target.value)}>
                <option value="">{t.parentNone}</option>
                {fatherCandidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>{candidate.fullName}</option>
                ))}
              </select>
            </label>
            {!form.isSubject && (
              <label>
                <span className="field-label">{t.email}</span>
                <input className="input" name="email" type="email" value={form.email} onChange={(event) => patch("email", event.target.value)} />
              </label>
            )}
            <p className="md:col-span-3 text-xs leading-5 text-[var(--muted)]">{t.parentsHelp}</p>
          </>
        )}
        {!form.isSubject && parentCandidates.length === 0 && (
          <label className="md:col-span-2">
            <span className="field-label">{t.email}</span>
            <input className="input" name="email" type="email" value={form.email} onChange={(event) => patch("email", event.target.value)} />
          </label>
        )}
        <label className="md:col-span-3">
          <span className="field-label">{t.notes}</span>
          <textarea className="textarea !min-h-20" name="notes" maxLength={300} value={form.notes} onChange={(event) => patch("notes", event.target.value)} />
        </label>
        {!form.isSubject && (
          <>
            <label className="flex items-end gap-2 pb-3 text-sm font-bold md:col-span-2">
              <input type="checkbox" name="canReadTimeline" checked={form.canReadTimeline} onChange={(event) => patch("canReadTimeline", event.target.checked)} />
              {t.share}
            </label>
            <p className="md:col-span-3 text-xs leading-5 text-[var(--muted)]">{t.shareHelp}</p>
          </>
        )}
        {showReminder && (
          <FamilyPersonReminderEdit
            locale={locale}
            birthDate={form.birthDate}
            person={person}
            presets={presets}
            calendar={calendar}
            enabled={form.birthdayReminderEnabled}
            offsets={form.offsets}
            onEnabledChange={(value) => patch("birthdayReminderEnabled", value)}
            onOffsetsChange={(value) => patch("offsets", value)}
          />
        )}
        <div className={`flex flex-wrap items-end gap-2 ${canDelete ? "md:col-span-3" : ""}`}>
          <button disabled={pending || !canSubmit} className={`btn btn-primary ${canDelete ? "flex-1" : "w-full"}`} type="submit">
            <Plus size={16} />
            {person ? t.update : t.save}
          </button>
          {canDelete && (
            <button
              type="button"
              className="btn btn-danger"
              disabled={pending || deletePending}
              onClick={() => {
                setDeleteStep(1);
                setDeleteError(undefined);
                setDeleteOpen(true);
              }}
            >
              <Trash2 size={16} />
              {t.delete}
            </button>
          )}
        </div>
      </form>
      {canDelete && person && (
        <ConfirmDialog
          open={deleteOpen}
          title={deleteStep === 1 ? t.deleteTitle : t.deleteFinalTitle(person.fullName)}
          body={`${deleteStep === 1 ? t.deleteBody(person.fullName) : t.deleteFinalBody}${deleteError ? `\n\n${deleteError}` : ""}`}
          cancelLabel={deleteStep === 1 ? t.deleteCancel : t.deleteBack}
          onClose={() => {
            if (deletePending) return;
            if (deleteStep === 2) setDeleteStep(1);
            else closeDeleteDialog();
          }}
          actions={deleteStep === 1
            ? [{ label: t.deleteContinue, onClick: () => { setDeleteError(undefined); setDeleteStep(2); }, variant: "primary" }]
            : [{ label: deletePending ? "…" : t.deleteConfirm, onClick: confirmDelete, variant: "danger" }]}
        />
      )}
    </section>
  );
}
