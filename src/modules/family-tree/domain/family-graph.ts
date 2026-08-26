export const RELATIONSHIP_TYPES = ["parent", "partner", "sibling"] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

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
  isSubject: boolean;
};

export type FamilyRelationship = {
  id: string;
  userId: string;
  sourcePersonId: string;
  targetPersonId: string;
  relationshipType: RelationshipType;
};

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
  locale: "es" | "en",
) {
  if (!subjectId) return "";
  if (personId === subjectId) return locale === "es" ? "Tú" : "You";
  const parentOfSubject = relationships.some((item) => item.relationshipType === "parent" && item.sourcePersonId === personId && item.targetPersonId === subjectId);
  if (parentOfSubject) return locale === "es" ? "Progenitor" : "Parent";
  const childOfSubject = relationships.some((item) => item.relationshipType === "parent" && item.sourcePersonId === subjectId && item.targetPersonId === personId);
  if (childOfSubject) return locale === "es" ? "Hijo/a" : "Child";
  const sibling = relationships.some((item) => item.relationshipType === "sibling" && ((item.sourcePersonId === personId && item.targetPersonId === subjectId) || (item.targetPersonId === personId && item.sourcePersonId === subjectId)));
  if (sibling) return locale === "es" ? "Hermano/a" : "Sibling";
  const parents = relationships.filter((item) => item.relationshipType === "parent" && item.targetPersonId === subjectId).map((item) => item.sourcePersonId);
  const grandparent = relationships.some((item) => item.relationshipType === "parent" && item.sourcePersonId === personId && parents.includes(item.targetPersonId));
  if (grandparent) return locale === "es" ? "Abuelo/a" : "Grandparent";
  return "";
}
