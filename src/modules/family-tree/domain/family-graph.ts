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
  isSubject: boolean;
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

function parentIdsOf(personId: string, relationships: FamilyRelationship[]) {
  return relationships
    .filter((item) => item.relationshipType === "parent" && item.targetPersonId === personId)
    .map((item) => item.sourcePersonId);
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

  if (personId === subjectId) return locale === "es" ? "TÚ" : "YOU";

  const isParentOfSubject = relationships.some(
    (item) => item.relationshipType === "parent" && item.sourcePersonId === personId && item.targetPersonId === subjectId,
  );
  if (isParentOfSubject) {
    return genderedLabel(gender, locale === "es"
      ? { male: "PADRE", female: "MADRE", neutral: "PROGENITOR" }
      : { male: "FATHER", female: "MOTHER", neutral: "PARENT" });
  }

  const isChildOfSubject = relationships.some(
    (item) => item.relationshipType === "parent" && item.sourcePersonId === subjectId && item.targetPersonId === personId,
  );
  if (isChildOfSubject) {
    return genderedLabel(gender, locale === "es"
      ? { male: "HIJO", female: "HIJA", neutral: "HIJO/A" }
      : { male: "SON", female: "DAUGHTER", neutral: "CHILD" });
  }

  const subjectParents = parentIdsOf(subjectId, relationships);
  const personParents = parentIdsOf(personId, relationships);
  const sharedParents = subjectParents.filter((id) => personParents.includes(id));

  if (sharedParents.length >= 2) {
    return genderedLabel(gender, locale === "es"
      ? { male: "HERMANO", female: "HERMANA", neutral: "HERMANO/A" }
      : { male: "BROTHER", female: "SISTER", neutral: "SIBLING" });
  }
  if (sharedParents.length === 1) {
    return genderedLabel(gender, locale === "es"
      ? { male: "HERMANASTRO", female: "HERMANASTRA", neutral: "HERMANASTRO/A" }
      : { male: "HALF-BROTHER", female: "HALF-SISTER", neutral: "HALF-SIBLING" });
  }

  const explicitSibling = relationships.some(
    (item) => item.relationshipType === "sibling"
      && ((item.sourcePersonId === personId && item.targetPersonId === subjectId)
        || (item.targetPersonId === personId && item.sourcePersonId === subjectId)),
  );
  if (explicitSibling) {
    return genderedLabel(gender, locale === "es"
      ? { male: "HERMANO", female: "HERMANA", neutral: "HERMANO/A" }
      : { male: "BROTHER", female: "SISTER", neutral: "SIBLING" });
  }

  const grandparent = subjectParents.some((parentId) => parentIdsOf(parentId, relationships).includes(personId));
  if (grandparent) {
    return genderedLabel(gender, locale === "es"
      ? { male: "ABUELO", female: "ABUELA", neutral: "ABUELO/A" }
      : { male: "GRANDFATHER", female: "GRANDMOTHER", neutral: "GRANDPARENT" });
  }

  return "";
}
