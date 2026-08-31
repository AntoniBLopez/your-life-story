"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/shared/lib/auth";
import type { ActionResult } from "@/shared/types/action";
import { assertNoParentCycle } from "../domain/family-graph";
import { parseGedcom } from "../domain/gedcom";
import { MongoFamilyRepository } from "../infrastructure/mongo-family-repository";
import { syncPersonParents } from "./family-parent-sync";
import { familyNodeLayoutSchema, familyPersonSchema, familyRelationshipSchema } from "./family-schemas";
import { importBassolsFamilySeed } from "./family-seed-service";

const repository = new MongoFamilyRepository();

function personPayload(parsed: ReturnType<typeof familyPersonSchema.parse>) {
  const { motherId: _motherId, fatherId: _fatherId, ...person } = parsed;
  return person;
}

export async function createFamilyPersonAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = familyPersonSchema.safeParse({ ...Object.fromEntries(formData.entries()), isSubject: formData.get("isSubject") === "on" });
  if (!parsed.success) return { ok: false, error: "Revisa los datos de esta persona." };
  try {
    const user = await requireCurrentUser();
    const { motherId, fatherId } = parsed.data;
    const person = await repository.addPerson(user.id, personPayload(parsed.data));
    if (motherId || fatherId) {
      await syncPersonParents(repository, user.id, person.id, motherId, fatherId);
    }
    revalidatePath(`/${String(formData.get("locale")) === "en" ? "en" : "es"}/app/family`);
    return { ok: true, data: { id: person.id } };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "No se pudo añadir a esta persona." }; }
}

export async function updateFamilyPersonAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = familyPersonSchema.safeParse({ ...Object.fromEntries(formData.entries()), isSubject: formData.get("isSubject") === "on" });
  const personId = String(formData.get("personId") ?? "");
  if (!parsed.success || !personId) return { ok: false, error: "Revisa los datos de esta persona." };
  try {
    const user = await requireCurrentUser();
    const { motherId, fatherId } = parsed.data;
    await repository.updatePerson(user.id, personId, personPayload(parsed.data));
    await syncPersonParents(repository, user.id, personId, motherId, fatherId);
    const locale = String(formData.get("locale")) === "en" ? "en" : "es";
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
      const created = await repository.addPerson(user.id, { fullName: person.fullName, birthDate: person.birthDate, birthDatePrecision: person.birthDatePrecision, deathDate: person.deathDate, deathDatePrecision: person.deathDatePrecision, birthCountry: person.birthCountry, birthCity: person.birthCity, gender: person.gender ?? null, baptized: person.baptized ?? null, notes: person.notes ?? null, isSubject: false });
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
