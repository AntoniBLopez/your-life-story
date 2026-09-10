"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Cake, CalendarPlus, LoaderCircle, PartyPopper, Pencil, X } from "lucide-react";
import { quickBirthdayReminderAction } from "@/modules/family-tree/application/birthday-reminder-actions";
import { birthdayCelebrationOn, canRemindBirthday, type BirthdayReminderPreset } from "@/modules/family-tree/domain/birthday-reminder";
import { formatPersonChildCount, type FamilyPerson } from "@/modules/family-tree/domain/family-graph";
import { BirthdayReminderOffsetEditor, defaultOffsetsFromPresets } from "@/modules/family-tree/presentation/components/birthday-reminder-offset-editor";

type Parents = { mother?: FamilyPerson; father?: FamilyPerson };

export function FamilyPersonAside({
  locale,
  person,
  parents,
  childCount,
  youPersonId,
  presets,
  calendar,
  labels,
  readOnly,
  today,
  onClose,
  onEdit,
}: {
  locale: "es" | "en";
  person: FamilyPerson;
  parents: Parents;
  childCount: number;
  youPersonId?: string;
  presets: BirthdayReminderPreset[];
  calendar?: { connected: boolean; email: string | null };
  today?: string;
  labels: {
    details: string;
    birth: string;
    death: string;
    city: string;
    country: string;
    parents: string;
    baptized: string;
    baptizedYes: string;
    baptizedNo: string;
    notes: string;
    email: string;
    share: string;
    shared: string;
    edit: string;
    close: string;
  };
  readOnly?: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [setupOpen, setSetupOpen] = useState(false);
  const [calendarPromptOpen, setCalendarPromptOpen] = useState(false);
  const [offsets, setOffsets] = useState(() => defaultOffsetsFromPresets(presets));
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [timeZone, setTimeZone] = useState("UTC");
  const [reminderEnabled, setReminderEnabled] = useState(Boolean(person.birthdayReminderEnabled));
  const hasBirth = canRemindBirthday(person.birthDate);
  const hasPreset = presets.length > 0;
  const hasCalendar = Boolean(calendar?.connected);
  const isMe = youPersonId ? person.id === youPersonId : person.isSubject;
  const childSummary = formatPersonChildCount(childCount, Boolean(person.deathDate), locale);
  const birthday = today ? birthdayCelebrationOn(person, today) : { celebrating: false, age: null };
  const birthdayText = birthday.celebrating
    ? typeof birthday.age === "number"
      ? locale === "es" ? `Hoy cumple ${birthday.age}` : `Turns ${birthday.age} today`
      : locale === "es" ? "Hoy es su cumpleaños" : "Birthday today"
    : null;
  const t = locale === "es"
    ? {
        remember: "Recordar cumpleaños",
        setupTitle: "Avisos de cumpleaños",
        setupBody: "Estos avisos valen para todas las personas del árbol. Después solo tendrás que pulsar el botón en cada una.",
        saveAndRemember: "Guardar y recordar",
        connect: "Conectar Google Calendar",
        connectTitle: "Conecta Google Calendar",
        connectBody: "Para recordar cumpleaños necesitas conectar Google Calendar. Después podrás activar el recordatorio aquí.",
        connected: "Avisos en",
        needBirth: "Añade la fecha de nacimiento para poder recordar el cumpleaños.",
        needBirthTooltip: "Añade fecha de nacimiento para poder añadir el recordatorio",
        enabled: "Recordatorio activado en Google Calendar.",
        needCalendarFirst: "Conecta Google Calendar antes de guardar los avisos.",
      }
    : {
        remember: "Remember birthday",
        setupTitle: "Birthday reminders",
        setupBody: "These reminders apply to everyone in the tree. After this, you only need the button on each person.",
        saveAndRemember: "Save and remember",
        connect: "Connect Google Calendar",
        connectTitle: "Connect Google Calendar",
        connectBody: "To remember birthdays you need to connect Google Calendar first. Then you can turn the reminder on here.",
        connected: "Reminders go to",
        needBirth: "Add a date of birth to remember this birthday.",
        needBirthTooltip: "Add date of birth to add the reminder",
        enabled: "Reminder enabled in Google Calendar.",
        needCalendarFirst: "Connect Google Calendar before saving reminders.",
      };

  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    setOffsets(defaultOffsetsFromPresets(presets));
    setSetupOpen(false);
    setCalendarPromptOpen(false);
    setMessage(undefined);
    setError(undefined);
    setReminderEnabled(Boolean(person.birthdayReminderEnabled));
  }, [person.id, person.birthdayReminderEnabled, presets]);

  const calendarHref = useMemo(
    () => `/api/auth/google/calendar?locale=${locale}&next=${encodeURIComponent(`/${locale}/app/family`)}&timeZone=${encodeURIComponent(timeZone)}`,
    [locale, timeZone],
  );

  const eyebrow = youPersonId && person.id === youPersonId
    ? (locale === "es" ? "Tú en este árbol" : "You in this tree")
    : person.isSubject
      ? (youPersonId ? (locale === "es" ? "Protagonista" : "Storyteller") : (locale === "es" ? "Tu persona" : "You"))
      : labels.details;

  function runQuick(enableOffsets?: typeof offsets) {
    setError(undefined);
    setMessage(undefined);
    startTransition(async () => {
      const result = await quickBirthdayReminderAction({
        personId: person.id,
        locale,
        timeZone,
        offsets: enableOffsets,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.data.needsCalendar) {
        setCalendarPromptOpen(true);
        setSetupOpen(false);
        return;
      }
      if (result.data.needsSetup) {
        setSetupOpen(true);
        setCalendarPromptOpen(!hasCalendar);
        return;
      }
      setSetupOpen(false);
      setCalendarPromptOpen(false);
      if (result.data.enabled) {
        setReminderEnabled(true);
        setMessage(t.enabled);
      }
      router.refresh();
    });
  }

  function onRememberClick() {
    if (!hasBirth) {
      setError(t.needBirth);
      return;
    }
    if (!hasCalendar) {
      setCalendarPromptOpen(true);
      if (!hasPreset) setSetupOpen(true);
      return;
    }
    if (!hasPreset) {
      setSetupOpen(true);
      return;
    }
    runQuick();
  }

  return (
    <aside
      className={`absolute top-4 right-4 z-10 w-[min(300px,calc(100%-2rem))] max-h-[calc(100%-2rem)] overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl border border-[var(--moss)]/30 bg-[var(--paper)]/95 p-4 shadow-2xl backdrop-blur ${birthday.celebrating ? "family-aside--birthday" : ""}`}
      onWheel={(event) => event.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="display mt-1 text-xl break-words">{person.fullName}</h2>
          {birthdayText && (
            <span className="family-node-birthday-badge mt-2">
              <PartyPopper size={12} className="shrink-0" />
              {birthdayText}
            </span>
          )}
        </div>
        <button aria-label={labels.close} className="btn btn-quiet shrink-0 !p-1" onClick={onClose}><X size={16} /></button>
      </div>
      <dl className="mt-4 grid min-w-0 gap-2 text-xs">
        <div className="flex justify-between gap-3"><dt className="font-bold text-[var(--muted)]">{labels.birth}</dt><dd>{person.birthDate ?? "—"}</dd></div>
        <div className="flex justify-between gap-3"><dt className="font-bold text-[var(--muted)]">{labels.death}</dt><dd>{person.deathDate ?? "—"}</dd></div>
        <div className="flex justify-between gap-3"><dt className="font-bold text-[var(--muted)]">{labels.city}</dt><dd className="text-right">{person.birthCity ?? "—"}</dd></div>
        <div className="flex justify-between gap-3"><dt className="font-bold text-[var(--muted)]">{labels.country}</dt><dd className="text-right">{person.birthCountry ?? "—"}</dd></div>
        {(parents.mother || parents.father) && (
          <div className="flex justify-between gap-3">
            <dt className="font-bold text-[var(--muted)]">{labels.parents}</dt>
            <dd className="text-right">{[parents.mother?.fullName, parents.father?.fullName].filter(Boolean).join(" · ") || "—"}</dd>
          </div>
        )}
        <div className="flex justify-between gap-3">
          <dt className="font-bold text-[var(--muted)]">{childSummary.label}</dt>
          <dd className="text-right">{childSummary.value}</dd>
        </div>
        {person.baptized !== null && (
          <div className="flex justify-between gap-3">
            <dt className="font-bold text-[var(--muted)]">{labels.baptized}</dt>
            <dd className="text-right">{person.baptized ? labels.baptizedYes : labels.baptizedNo}</dd>
          </div>
        )}
        {person.notes && (
          <div>
            <dt className="font-bold text-[var(--muted)]">{labels.notes}</dt>
            <dd className="mt-1 text-[var(--ink)]">{person.notes}</dd>
          </div>
        )}
        {person.email && !readOnly && (
          <div className="flex justify-between gap-3">
            <dt className="font-bold text-[var(--muted)]">{labels.email}</dt>
            <dd className="text-right">{person.email}</dd>
          </div>
        )}
        {person.canReadTimeline && !readOnly && (
          <div className="flex justify-between gap-3">
            <dt className="font-bold text-[var(--muted)]">{labels.share}</dt>
            <dd className="text-right">{labels.shared}</dd>
          </div>
        )}
        {reminderEnabled && !readOnly && !isMe && (
          <div className="flex justify-between gap-3">
            <dt className="font-bold text-[var(--muted)]">{locale === "es" ? "Recordatorio" : "Reminder"}</dt>
            <dd className="text-right">{locale === "es" ? "Google Calendar" : "Google Calendar"}</dd>
          </div>
        )}
      </dl>
      {!readOnly && (
      <div className="mt-4 flex flex-col gap-2">
        <button className="btn btn-primary w-full" onClick={onEdit}><Pencil size={14} />{labels.edit}</button>
        {!reminderEnabled && !isMe && (
          <span className="w-full" title={!hasBirth ? t.needBirthTooltip : undefined}>
            <button
              disabled={pending || !hasBirth}
              className="btn btn-quiet w-full border border-[var(--line)] !py-2 text-xs disabled:cursor-not-allowed"
              onClick={onRememberClick}
            >
              {pending ? <LoaderCircle className="animate-spin" size={14} /> : <Cake size={14} />}
              {t.remember}
            </button>
          </span>
        )}
      </div>
      )}
      {!readOnly && calendarPromptOpen && !reminderEnabled && !isMe && (
        <div className="mt-4 min-w-0 overflow-hidden rounded-xl border border-[var(--line)] bg-[#fbfaf6] p-3">
          <p className="text-sm font-bold text-[var(--ink)]">{t.connectTitle}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{t.connectBody}</p>
          <a className="btn btn-primary mt-3 w-full !py-2 text-xs" href={calendarHref}>
            <CalendarPlus size={14} />
            {t.connect}
          </a>
        </div>
      )}
      {!readOnly && setupOpen && !reminderEnabled && !isMe && (
        <div className="mt-4 min-w-0 overflow-hidden rounded-xl border border-[var(--line)] bg-[#fbfaf6] p-3">
          <p className="text-sm font-bold text-[var(--ink)]">{t.setupTitle}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{t.setupBody}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-white p-2.5 text-[11px]">
            {hasCalendar ? (
              <>
                <CalendarPlus size={14} className="text-[var(--moss)]" />
                <span>{t.connected} <strong>{calendar?.email}</strong></span>
              </>
            ) : (
              <a className="btn btn-secondary !px-2.5 !py-1.5 text-[11px]" href={calendarHref}>{t.connect}</a>
            )}
          </div>
          {!hasCalendar && <p className="mt-2 text-xs text-[var(--muted)]">{t.needCalendarFirst}</p>}
          <BirthdayReminderOffsetEditor locale={locale} offsets={offsets} onChange={setOffsets} compact />
          <button
            disabled={pending || offsets.length === 0 || !hasCalendar}
            className="btn btn-primary mt-3 w-full !py-2 text-xs"
            onClick={() => runQuick(offsets)}
          >
            {pending ? <LoaderCircle className="animate-spin" size={14} /> : <Cake size={14} />}
            {t.saveAndRemember}
          </button>
        </div>
      )}
      {error && !readOnly && <p className="field-error mt-3 text-xs">{error}</p>}
      {message && !readOnly && <p className="mt-3 rounded-xl bg-[#edf5ec] p-2.5 text-xs text-[var(--moss-deep)]">{message}</p>}
    </aside>
  );
}
