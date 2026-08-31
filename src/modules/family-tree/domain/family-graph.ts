export const RELATIONSHIP_TYPES = ["parent", "partner", "sibling"] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export type PersonGender = "male" | "female" | null;

export type FamilyPerson = {
  id: string;
  userId: string;
  fullName: string;
  birthDate: string | null;
  birthDatePrecision: "day" | "month" | "year" | null;
  deathDate: string | null;
  deathDatePrecision: "day" | "month" | "year" | null;
  birthCountry: string | null;
  birthCity: string | null;
  gender: PersonGender;
  baptized: boolean | null;
  notes: string | null;
  email?: string | null;
  canReadTimeline?: boolean;
  isSubject: boolean;
  layoutX?: number | null;
  layoutY?: number | null;
};

export type FamilyRelationship = {
  id: string;
  userId: string;
  sourcePersonId: string;
  targetPersonId: string;
  relationshipType: RelationshipType;
};

const FEMALE_FIRST_NAMES = new Set([
  "mireya", "rosario", "maria", "ana", "clara", "laura", "elena", "sara", "julia", "carmen", "lucia",
]);
const MALE_FIRST_NAMES = new Set([
  "antoni", "kevin", "manuel", "luis", "juan", "carlos", "marc", "pablo", "david", "jordi", "toni",
]);

export function inferGender(person: Pick<FamilyPerson, "fullName" | "gender">): PersonGender {
  if (person.gender) return person.gender;
  const first = person.fullName.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (FEMALE_FIRST_NAMES.has(first)) return "female";
  if (MALE_FIRST_NAMES.has(first)) return "male";
  return null;
}

export function parentsOf(personId: string, relationships: FamilyRelationship[]) {
  return relationships
    .filter((item) => item.relationshipType === "parent" && item.targetPersonId === personId)
    .map((item) => item.sourcePersonId);
}

export function resolveParentSlots(
  childId: string,
  relationships: FamilyRelationship[],
  people: FamilyPerson[],
) {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  let motherId: string | null = null;
  let fatherId: string | null = null;
  const unassigned: string[] = [];

  for (const parentId of parentsOf(childId, relationships)) {
    const gender = inferGender(peopleById.get(parentId) ?? { fullName: "", gender: null });
    if (gender === "female" && !motherId) motherId = parentId;
    else if (gender === "male" && !fatherId) fatherId = parentId;
    else unassigned.push(parentId);
  }

  for (const parentId of unassigned) {
    if (!motherId) motherId = parentId;
    else if (!fatherId) fatherId = parentId;
  }

  return { motherId, fatherId };
}

function childrenOf(personId: string, relationships: FamilyRelationship[]) {
  return relationships
    .filter((item) => item.relationshipType === "parent" && item.sourcePersonId === personId)
    .map((item) => item.targetPersonId);
}

function partnersOf(personId: string, relationships: FamilyRelationship[]) {
  return relationships
    .filter((item) => item.relationshipType === "partner" && (item.sourcePersonId === personId || item.targetPersonId === personId))
    .map((item) => (item.sourcePersonId === personId ? item.targetPersonId : item.sourcePersonId));
}

function explicitSiblingsOf(personId: string, relationships: FamilyRelationship[]) {
  return relationships
    .filter((item) => item.relationshipType === "sibling" && (item.sourcePersonId === personId || item.targetPersonId === personId))
    .map((item) => (item.sourcePersonId === personId ? item.targetPersonId : item.sourcePersonId));
}

function siblingsOf(personId: string, relationships: FamilyRelationship[]) {
  const parentIds = parentsOf(personId, relationships);
  const byParents = parentIds.flatMap((parentId) =>
    childrenOf(parentId, relationships).filter((childId) => childId !== personId),
  );
  const explicit = explicitSiblingsOf(personId, relationships);
  return [...new Set([...byParents, ...explicit])];
}

function stepParentsOf(subjectId: string, relationships: FamilyRelationship[]) {
  const subjectParentSet = new Set(parentsOf(subjectId, relationships));
  const result = new Set<string>();

  for (const siblingId of siblingsOf(subjectId, relationships)) {
    const siblingParents = parentsOf(siblingId, relationships);
    const sharedParents = siblingParents.filter((parentId) => subjectParentSet.has(parentId));
    if (sharedParents.length !== 1) continue;

    for (const parentId of siblingParents) {
      if (!subjectParentSet.has(parentId)) result.add(parentId);
    }
  }

  for (const parentId of subjectParentSet) {
    for (const partnerId of partnersOf(parentId, relationships)) {
      if (!subjectParentSet.has(partnerId)) result.add(partnerId);
    }
  }

  return result;
}

function ancestorsAtGeneration(personId: string, generation: number, relationships: FamilyRelationship[]) {
  let current = new Set([personId]);
  for (let step = 0; step < generation; step += 1) {
    const next = new Set<string>();
    for (const id of current) {
      for (const parentId of parentsOf(id, relationships)) next.add(parentId);
    }
    current = next;
  }
  return current;
}

function descendantsAtGeneration(personId: string, generation: number, relationships: FamilyRelationship[]) {
  let current = new Set([personId]);
  for (let step = 0; step < generation; step += 1) {
    const next = new Set<string>();
    for (const id of current) {
      for (const childId of childrenOf(id, relationships)) next.add(childId);
    }
    current = next;
  }
  current.delete(personId);
  return current;
}

function unclesAndAuntsOf(personId: string, relationships: FamilyRelationship[]) {
  const result = new Set<string>();
  for (const parentId of parentsOf(personId, relationships)) {
    for (const siblingId of siblingsOf(parentId, relationships)) {
      if (siblingId !== personId) result.add(siblingId);
    }
  }
  return result;
}

function cousinsOf(personId: string, relationships: FamilyRelationship[]) {
  const result = new Set<string>();
  for (const uncleId of unclesAndAuntsOf(personId, relationships)) {
    for (const childId of childrenOf(uncleId, relationships)) result.add(childId);
  }
  return result;
}

function genderedLabel(
  gender: PersonGender,
  labels: { male: string; female: string; neutral: string },
) {
  if (gender === "male") return labels.male;
  if (gender === "female") return labels.female;
  return labels.neutral;
}

export function assertNoParentCycle(
  relationships: FamilyRelationship[],
  parentId: string,
  childId: string,
) {
  if (parentId === childId) throw new Error("Una persona no puede ser su propio progenitor.");
  const childrenByParent = new Map<string, string[]>();
  for (const relationship of relationships.filter((item) => item.relationshipType === "parent")) {
    childrenByParent.set(relationship.sourcePersonId, [...(childrenByParent.get(relationship.sourcePersonId) ?? []), relationship.targetPersonId]);
  }
  const descendants = new Set<string>();
  const visit = (id: string) => {
    for (const child of childrenByParent.get(id) ?? []) if (!descendants.has(child)) { descendants.add(child); visit(child); }
  };
  visit(childId);
  if (descendants.has(parentId)) throw new Error("Este vínculo crearía un ciclo en el árbol familiar.");
}

export function relationToSubject(
  personId: string,
  subjectId: string | undefined,
  relationships: FamilyRelationship[],
  people: FamilyPerson[],
  locale: "es" | "en",
) {
  if (!subjectId) return "";
  const person = people.find((item) => item.id === personId);
  const gender = inferGender(person ?? { fullName: "", gender: null });
  const es = locale === "es";

  if (personId === subjectId) return es ? "TÚ" : "YOU";

  const subjectParents = parentsOf(subjectId, relationships);
  const personParents = parentsOf(personId, relationships);
  const sharedParents = subjectParents.filter((id) => personParents.includes(id));

  if (subjectParents.includes(personId)) {
    return genderedLabel(gender, es
      ? { male: "PADRE", female: "MADRE", neutral: "PROGENITOR" }
      : { male: "FATHER", female: "MOTHER", neutral: "PARENT" });
  }

  if (parentsOf(personId, relationships).includes(subjectId)) {
    return genderedLabel(gender, es
      ? { male: "HIJO", female: "HIJA", neutral: "HIJO/A" }
      : { male: "SON", female: "DAUGHTER", neutral: "CHILD" });
  }

  if (partnersOf(subjectId, relationships).includes(personId)) {
    return genderedLabel(gender, es
      ? { male: "PAREJA", female: "PAREJA", neutral: "PAREJA" }
      : { male: "PARTNER", female: "PARTNER", neutral: "PARTNER" });
  }

  if (sharedParents.length >= 2) {
    return genderedLabel(gender, es
      ? { male: "HERMANO", female: "HERMANA", neutral: "HERMANO/A" }
      : { male: "BROTHER", female: "SISTER", neutral: "SIBLING" });
  }

  if (sharedParents.length === 1) {
    return genderedLabel(gender, es
      ? { male: "HERMANASTRO", female: "HERMANASTRA", neutral: "HERMANASTRO/A" }
      : { male: "HALF-BROTHER", female: "HALF-SISTER", neutral: "HALF-SIBLING" });
  }

  if (explicitSiblingsOf(subjectId, relationships).includes(personId)) {
    return genderedLabel(gender, es
      ? { male: "HERMANO", female: "HERMANA", neutral: "HERMANO/A" }
      : { male: "BROTHER", female: "SISTER", neutral: "SIBLING" });
  }

  if (stepParentsOf(subjectId, relationships).has(personId)) {
    return genderedLabel(gender, es
      ? { male: "PADRASTRO", female: "MADRASTRA", neutral: "PADRASTRO/MADRASTRA" }
      : { male: "STEPFATHER", female: "STEPMOTHER", neutral: "STEP-PARENT" });
  }

  const grandparents = ancestorsAtGeneration(subjectId, 2, relationships);
  grandparents.delete(subjectId);
  if (grandparents.has(personId)) {
    return genderedLabel(gender, es
      ? { male: "ABUELO", female: "ABUELA", neutral: "ABUELO/A" }
      : { male: "GRANDFATHER", female: "GRANDMOTHER", neutral: "GRANDPARENT" });
  }

  const greatGrandparents = ancestorsAtGeneration(subjectId, 3, relationships);
  greatGrandparents.delete(subjectId);
  for (const id of grandparents) greatGrandparents.delete(id);
  for (const id of subjectParents) greatGrandparents.delete(id);
  if (greatGrandparents.has(personId)) {
    return genderedLabel(gender, es
      ? { male: "BISABUELO", female: "BISABUELA", neutral: "BISABUELO/A" }
      : { male: "GREAT-GRANDFATHER", female: "GREAT-GRANDMOTHER", neutral: "GREAT-GRANDPARENT" });
  }

  const greatGreatGrandparents = ancestorsAtGeneration(subjectId, 4, relationships);
  greatGreatGrandparents.delete(subjectId);
  for (const id of greatGrandparents) greatGreatGrandparents.delete(id);
  for (const id of grandparents) greatGreatGrandparents.delete(id);
  if (greatGreatGrandparents.has(personId)) {
    return genderedLabel(gender, es
      ? { male: "TATARABUELO", female: "TATARABUELA", neutral: "TATARABUELO/A" }
      : { male: "GREAT-GREAT-GRANDFATHER", female: "GREAT-GREAT-GRANDMOTHER", neutral: "GREAT-GREAT-GRANDPARENT" });
  }

  const grandchildren = descendantsAtGeneration(subjectId, 2, relationships);
  if (grandchildren.has(personId)) {
    return genderedLabel(gender, es
      ? { male: "NIETO", female: "NIETA", neutral: "NIETO/A" }
      : { male: "GRANDSON", female: "GRANDDAUGHTER", neutral: "GRANDCHILD" });
  }

  const greatGrandchildren = descendantsAtGeneration(subjectId, 3, relationships);
  if (greatGrandchildren.has(personId)) {
    return genderedLabel(gender, es
      ? { male: "BISNIETO", female: "BISNIETA", neutral: "BISNIETO/A" }
      : { male: "GREAT-GRANDSON", female: "GREAT-GRANDDAUGHTER", neutral: "GREAT-GRANDCHILD" });
  }

  const nephewsAndNieces = new Set<string>();
  for (const siblingId of siblingsOf(subjectId, relationships)) {
    for (const childId of childrenOf(siblingId, relationships)) nephewsAndNieces.add(childId);
  }
  if (nephewsAndNieces.has(personId)) {
    return genderedLabel(gender, es
      ? { male: "SOBRINO", female: "SOBRINA", neutral: "SOBRINO/A" }
      : { male: "NEPHEW", female: "NIECE", neutral: "NIECE/NEPHEW" });
  }

  const uncles = unclesAndAuntsOf(subjectId, relationships);
  if (uncles.has(personId)) {
    return genderedLabel(gender, es
      ? { male: "TÍO", female: "TÍA", neutral: "TÍO/A" }
      : { male: "UNCLE", female: "AUNT", neutral: "AUNT/UNCLE" });
  }

  const greatUncles = new Set<string>();
  for (const grandparentId of grandparents) {
    for (const siblingId of siblingsOf(grandparentId, relationships)) {
      if (siblingId !== subjectId && !grandparents.has(siblingId) && !subjectParents.includes(siblingId)) {
        greatUncles.add(siblingId);
      }
    }
  }
  if (greatUncles.has(personId)) {
    return genderedLabel(gender, es
      ? { male: "TÍO ABUELO", female: "TÍA ABUELA", neutral: "TÍO/A ABUELO/A" }
      : { male: "GREAT-UNCLE", female: "GREAT-AUNT", neutral: "GREAT-AUNT/UNCLE" });
  }

  const cousins = cousinsOf(subjectId, relationships);
  if (cousins.has(personId)) {
    return genderedLabel(gender, es
      ? { male: "PRIMO", female: "PRIMA", neutral: "PRIMO/A" }
      : { male: "COUSIN", female: "COUSIN", neutral: "COUSIN" });
  }

  const secondCousins = new Set<string>();
  for (const cousinId of cousins) {
    for (const childId of childrenOf(cousinId, relationships)) secondCousins.add(childId);
  }
  if (secondCousins.has(personId)) {
    return genderedLabel(gender, es
      ? { male: "PRIMO SEGUNDO", female: "PRIMA SEGUNDA", neutral: "PRIMO/A SEGUNDO/A" }
      : { male: "SECOND COUSIN", female: "SECOND COUSIN", neutral: "SECOND COUSIN" });
  }

  const subjectPartner = partnersOf(subjectId, relationships);
  for (const partnerId of subjectPartner) {
    if (parentsOf(partnerId, relationships).includes(personId)) {
      return genderedLabel(gender, es
        ? { male: "SUEGRO", female: "SUEGRA", neutral: "SUEGRO/A" }
        : { male: "FATHER-IN-LAW", female: "MOTHER-IN-LAW", neutral: "PARENT-IN-LAW" });
    }
    if (siblingsOf(partnerId, relationships).includes(personId)) {
      return genderedLabel(gender, es
        ? { male: "CUÑADO", female: "CUÑADA", neutral: "CUÑADO/A" }
        : { male: "BROTHER-IN-LAW", female: "SISTER-IN-LAW", neutral: "SIBLING-IN-LAW" });
    }
  }

  for (const childId of childrenOf(subjectId, relationships)) {
    if (partnersOf(childId, relationships).includes(personId)) {
      return genderedLabel(gender, es
        ? { male: "YERNO", female: "NUERA", neutral: "YERNO/NUERA" }
        : { male: "SON-IN-LAW", female: "DAUGHTER-IN-LAW", neutral: "CHILD-IN-LAW" });
    }
  }

  return "";
}

export function normalizePersonEmail(value: string | null | undefined) {
  const email = value?.trim().toLowerCase() ?? "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function grantsTimelineAccess(person: Pick<FamilyPerson, "email" | "canReadTimeline" | "isSubject">) {
  return Boolean(!person.isSubject && person.canReadTimeline && normalizePersonEmail(person.email));
}
