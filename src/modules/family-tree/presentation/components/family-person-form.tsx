"use client";

import { useEffect, useMemo, useState } from "react";
import { Mars, Plus, Venus, X } from "lucide-react";
import { canRemindBirthday, type BirthdayReminderOffset, type BirthdayReminderPreset } from "@/modules/family-tree/domain/birthday-reminder";
import { parentCandidatesForRole, type FamilyPerson } from "@/modules/family-tree/domain/family-graph";
import { FamilyPersonReminderEdit, initialReminderOffsets, offsetsEqual } from "@/modules/family-tree/presentation/components/family-person-reminder-edit";

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
}) {
  const initial = useMemo(
    () => buildFormState(person, parentSlots, subject, presets),
    [person, parentSlots, subject, presets],
  );
  const [form, setForm] = useState(initial);
  const isDirty = useMemo(() => !formStatesEqual(form, initial), [form, initial]);
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
      };

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(new FormData(event.currentTarget));
  }

  const canSubmit = person ? isDirty : form.fullName.trim().length >= 2;
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
        <div className="flex items-end">
          <button disabled={pending || !canSubmit} className="btn btn-primary w-full" type="submit">
            <Plus size={16} />
            {person ? t.update : t.save}
          </button>
        </div>
      </form>
    </section>
  );
}
