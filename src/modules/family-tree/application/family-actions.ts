"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/shared/lib/auth";
import type { ActionResult } from "@/shared/types/action";
import { assertNoParentCycle, normalizePersonEmail } from "../domain/family-graph";
import { parseGedcom } from "../domain/gedcom";
import { canRemindBirthday, DEFAULT_BIRTHDAY_OFFSETS, defaultPresetName, normalizeOffsets } from "../domain/birthday-reminder";
import { MongoFamilyRepository } from "../infrastructure/mongo-family-repository";
import { MongoBirthdayReminderPresetRepository } from "../infrastructure/mongo-birthday-reminder-preset-repository";
import { syncPersonParents } from "./family-parent-sync";
import { familyNodeLayoutSchema, familyPersonSchema, familyRelationshipSchema } from "./family-schemas";
import { birthdayReminderOffsetsSchema } from "./birthday-reminder-schemas";
import { importBassolsFamilySeed } from "./family-seed-service";
import { getSharedTimelineForViewer } from "./timeline-share-service";
import { duplicateLifeStoryForUser } from "@/modules/life-story/application/life-story-service";
import { syncPeopleUsingPreset, syncPersonBirthdayReminders, unsyncAllBirthdayRemindersForUser } from "./birthday-reminder-service";

const repository = new MongoFamilyRepository();
const reminderPresets = new MongoBirthdayReminderPresetRepository();

function personPayload(parsed: ReturnType<typeof familyPersonSchema.parse>, formData: FormData, reminder: { enabled: boolean; presetId: string | null }) {
  const { motherId: _motherId, fatherId: _fatherId, ...person } = parsed;
  const email = normalizePersonEmail(person.email);
  return {
    ...person,
    email,
    canReadTimeline: formData.get("canReadTimeline") === "on" && !person.isSubject && Boolean(email),
    birthdayReminderEnabled: reminder.enabled,
    birthdayReminderPresetId: reminder.enabled ? reminder.presetId : null,
  };
}

async function reminderFromForm(userId: string, formData: FormData, birthDate: string | null, locale: "es" | "en") {
  const enabled = formData.get("birthdayReminderEnabled") === "on" && canRemindBirthday(birthDate);
  if (!enabled) return { enabled: false, presetId: null as string | null, offsets: [], changed: false };
  let parsedOffsets = DEFAULT_BIRTHDAY_OFFSETS;
  try {
    parsedOffsets = normalizeOffsets(birthdayReminderOffsetsSchema.parse(JSON.parse(String(formData.get("birthdayReminderOffsets") ?? "[]"))));
  } catch {
    parsedOffsets = DEFAULT_BIRTHDAY_OFFSETS;
  }
  if (parsedOffsets.length === 0) parsedOffsets = DEFAULT_BIRTHDAY_OFFSETS;
  const name = String(formData.get("birthdayReminderPresetName") ?? "").trim() || defaultPresetName(locale);
  const presetId = String(formData.get("birthdayReminderPresetId") ?? "") || null;
  const { preset, created, previousOffsets } = await reminderPresets.upsert(userId, {
    id: presetId,
    name,
    offsets: parsedOffsets,
    isDefault: formData.get("birthdayReminderDefault") === "on",
  });
  return {
    enabled: true,
    presetId: preset.id,
    offsets: preset.offsets,
    changed: !created && JSON.stringify(previousOffsets) !== JSON.stringify(preset.offsets),
  };
}

export async function createFamilyPersonAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = familyPersonSchema.safeParse({ ...Object.fromEntries(formData.entries()), isSubject: formData.get("isSubject") === "on" });
  if (!parsed.success) return { ok: false, error: "Revisa los datos de esta persona." };
  try {
    const user = await requireCurrentUser();
    const locale = String(formData.get("locale")) === "en" ? "en" : "es";
    const reminder = await reminderFromForm(user.id, formData, parsed.data.birthDate, locale);
    const { motherId, fatherId } = parsed.data;
    const person = await repository.addPerson(user.id, personPayload(parsed.data, formData, reminder));
    if (motherId || fatherId) {
      await syncPersonParents(repository, user.id, person.id, motherId, fatherId);
    }
    try {
      await syncPersonBirthdayReminders({
        userId: user.id,
        person,
        locale,
        timeZone: String(formData.get("timeZone") || "UTC"),
        offsets: reminder.offsets,
      });
      if (reminder.changed && reminder.presetId) {
        await syncPeopleUsingPreset(user.id, reminder.presetId, locale, String(formData.get("timeZone") || "UTC"));
      }
    } catch (error) {
      console.error("Birthday reminder calendar sync failed:", error);
    }
    revalidatePath(`/${locale}/app/family`);
    return { ok: true, data: { id: person.id } };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "No se pudo añadir a esta persona." }; }
}

export async function updateFamilyPersonAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = familyPersonSchema.safeParse({ ...Object.fromEntries(formData.entries()), isSubject: formData.get("isSubject") === "on" });
  const personId = String(formData.get("personId") ?? "");
  if (!parsed.success || !personId) return { ok: false, error: "Revisa los datos de esta persona." };
  try {
    const user = await requireCurrentUser();
    const locale = String(formData.get("locale")) === "en" ? "en" : "es";
    const reminder = await reminderFromForm(user.id, formData, parsed.data.birthDate, locale);
    const { motherId, fatherId } = parsed.data;
    const person = await repository.updatePerson(user.id, personId, personPayload(parsed.data, formData, reminder));
    await syncPersonParents(repository, user.id, personId, motherId, fatherId);
    try {
      await syncPersonBirthdayReminders({
        userId: user.id,
        person,
        locale,
        timeZone: String(formData.get("timeZone") || "UTC"),
        offsets: reminder.offsets,
      });
      if (reminder.changed && reminder.presetId) {
        await syncPeopleUsingPreset(user.id, reminder.presetId, locale, String(formData.get("timeZone") || "UTC"));
      }
    } catch (error) {
      console.error("Birthday reminder calendar sync failed:", error);
    }
    revalidatePath(`/${locale}/app/family`);
    return { ok: true, data: { id: personId } };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "No se pudo actualizar a esta persona." }; }
}

export async function createFamilyRelationshipAction(formData: FormData): Promise<ActionResult> {
  const parsed = familyRelationshipSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: "Elige dos personas y un vínculo válido." };
  try {
    const user = await requireCurrentUser();
    const [people, relationships] = await Promise.all([repository.listPeople(user.id), repository.listRelationships(user.id)]);
    if (!people.some((person) => person.id === parsed.data.sourcePersonId) || !people.some((person) => person.id === parsed.data.targetPersonId)) return { ok: false, error: "No tienes acceso a una de estas personas." };
    if (parsed.data.relationshipType === "parent") assertNoParentCycle(relationships, parsed.data.sourcePersonId, parsed.data.targetPersonId);
    await repository.addRelationship(user.id, parsed.data);
    revalidatePath(`/${String(formData.get("locale")) === "en" ? "en" : "es"}/app/family`);
    return { ok: true, data: undefined };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "No se pudo crear el vínculo." }; }
}

export async function importGedcomAction(formData: FormData): Promise<ActionResult<{ people: number; relationships: number }>> {
  const file = formData.get("gedcom");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Selecciona un archivo GEDCOM." };
  try {
    const parsed = parseGedcom(await file.text());
    if (parsed.people.length === 0) return { ok: false, error: "No se encontraron personas válidas en el archivo GEDCOM." };
    const user = await requireCurrentUser();
    const idByGedcomId = new Map<string, string>();
    for (const person of parsed.people) {
      const created = await repository.addPerson(user.id, { fullName: person.fullName, birthDate: person.birthDate, birthDatePrecision: person.birthDatePrecision, deathDate: person.deathDate, deathDatePrecision: person.deathDatePrecision, birthCountry: person.birthCountry, birthCity: person.birthCity, gender: person.gender ?? null, baptized: person.baptized ?? null, notes: person.notes ?? null, email: person.email ?? null, canReadTimeline: false, isSubject: false });
      idByGedcomId.set(person.gedcomId, created.id);
    }
    let relationshipCount = 0;
    for (const relationship of parsed.relationships) {
      const sourcePersonId = idByGedcomId.get(relationship.sourceGedcomId); const targetPersonId = idByGedcomId.get(relationship.targetGedcomId);
      if (!sourcePersonId || !targetPersonId) continue;
      await repository.addRelationship(user.id, { sourcePersonId, targetPersonId, relationshipType: relationship.relationshipType });
      relationshipCount += 1;
    }
    const locale = String(formData.get("locale")) === "en" ? "en" : "es";
    revalidatePath(`/${locale}/app/family`);
    return { ok: true, data: { people: parsed.people.length, relationships: relationshipCount } };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "No se pudo importar el archivo GEDCOM." }; }
}

export async function importBassolsFamilySeedAction(locale: string): Promise<ActionResult<{ people: number }>> {
  try {
    const user = await requireCurrentUser();
    await unsyncAllBirthdayRemindersForUser(user.id);
    await importBassolsFamilySeed(user.id);
    revalidatePath(`/${locale === "en" ? "en" : "es"}/app/family`);
    return { ok: true, data: { people: 21 } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo cargar el árbol familiar." };
  }
}

export async function saveFamilyNodeLayoutsAction(input: {
  positions: { personId: string; x: number; y: number }[];
}): Promise<ActionResult> {
  const parsed = familyNodeLayoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "No se pudieron guardar las posiciones." };
  try {
    const user = await requireCurrentUser();
    const people = await repository.listPeople(user.id);
    const allowedIds = new Set(people.map((person) => person.id));
    const layouts = parsed.data.positions
      .filter((position) => allowedIds.has(position.personId))
      .map((position) => ({
        personId: position.personId,
        layoutX: position.x,
        layoutY: position.y,
      }));
    if (layouts.length === 0) return { ok: false, error: "No se pudieron guardar las posiciones." };
    await repository.updatePeopleLayout(user.id, layouts);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudieron guardar las posiciones." };
  }
}

export async function duplicateSharedTimelineAction(ownerUserId: string, locale: "es" | "en"): Promise<ActionResult<{ entries: number }>> {
  try {
    const user = await requireCurrentUser();
    const shared = await getSharedTimelineForViewer(ownerUserId, user, locale);
    if (!shared) {
      return { ok: false, error: locale === "es" ? "No tienes acceso a este cronograma." : "You do not have access to this timeline." };
    }
    const result = await duplicateLifeStoryForUser(ownerUserId, user.id);
    revalidatePath(`/${locale}/app`);
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : locale === "es" ? "No se pudo copiar el cronograma." : "The timeline could not be copied." };
  }
}
