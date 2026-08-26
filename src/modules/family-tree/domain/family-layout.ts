import type { FamilyPerson, FamilyRelationship } from "./family-graph";

export const FAMILY_LAYOUT = {
  horizontalGap: 290,
  verticalGap: 190,
  nodeWidth: 224,
  paddingX: 80,
  paddingY: 110,
} as const;

export function birthSortKey(person: FamilyPerson) {
  if (!person.birthDate) return Number.MAX_SAFE_INTEGER;
  return Date.parse(`${person.birthDate}T00:00:00`);
}

export function sortPeopleByBirthDate(people: FamilyPerson[]) {
  return [...people].sort((left, right) => birthSortKey(left) - birthSortKey(right) || left.fullName.localeCompare(right.fullName));
}

export function computeGenerations(
  people: FamilyPerson[],
  relationships: FamilyRelationship[],
  subjectId: string | undefined,
) {
  const level = new Map<string, number>();
  if (subjectId) level.set(subjectId, 0);

  for (let pass = 0; pass < people.length + 1; pass += 1) {
    for (const relationship of relationships) {
      if (relationship.relationshipType !== "parent") continue;
      const parentLevel = level.get(relationship.sourcePersonId);
      const childLevel = level.get(relationship.targetPersonId);
      if (childLevel !== undefined && parentLevel === undefined) level.set(relationship.sourcePersonId, childLevel - 1);
      if (parentLevel !== undefined && childLevel === undefined) level.set(relationship.targetPersonId, parentLevel + 1);
    }
  }

  const groups = new Map<number, FamilyPerson[]>();
  for (const person of people) {
    const groupLevel = level.get(person.id) ?? 2;
    groups.set(groupLevel, [...(groups.get(groupLevel) ?? []), person]);
  }
  return groups;
}

export function assignHorizontalPositions(groups: Map<number, FamilyPerson[]>, horizontalGap = FAMILY_LAYOUT.horizontalGap) {
  const xByPerson = new Map<string, number>();
  for (const [, group] of groups) {
    const sorted = sortPeopleByBirthDate(group);
    sorted.forEach((person, index) => {
      xByPerson.set(person.id, index * horizontalGap);
    });
  }
  return xByPerson;
}

function pairKey(left: string, right: string) {
  return [left, right].sort().join("::");
}

export function impliedCoParentPairs(relationships: FamilyRelationship[]) {
  const parentsByChild = new Map<string, string[]>();
  for (const relationship of relationships) {
    if (relationship.relationshipType !== "parent") continue;
    parentsByChild.set(relationship.targetPersonId, [...(parentsByChild.get(relationship.targetPersonId) ?? []), relationship.sourcePersonId]);
  }

  const pairs = new Set<string>();
  for (const parentIds of parentsByChild.values()) {
    const uniqueParents = [...new Set(parentIds)];
    for (let index = 0; index < uniqueParents.length; index += 1) {
      for (let other = index + 1; other < uniqueParents.length; other += 1) {
        pairs.add(pairKey(uniqueParents[index], uniqueParents[other]));
      }
    }
  }
  return pairs;
}

export function listImpliedCoParentEdges(relationships: FamilyRelationship[]) {
  const explicitPartners = new Set(
    relationships
      .filter((relationship) => relationship.relationshipType === "partner")
      .map((relationship) => pairKey(relationship.sourcePersonId, relationship.targetPersonId)),
  );

  return [...impliedCoParentPairs(relationships)]
    .filter((pair) => !explicitPartners.has(pair))
    .map((pair) => {
      const [source, target] = pair.split("::");
      return { source, target };
    });
}

export function buildFamilyPositions(
  people: FamilyPerson[],
  relationships: FamilyRelationship[],
  subjectId: string | undefined,
) {
  const groups = computeGenerations(people, relationships, subjectId);
  const xByPerson = assignHorizontalPositions(groups);
  const minimumX = Math.min(...xByPerson.values(), 0);
  const positions = new Map<string, { x: number; y: number; generation: number }>();

  for (const [generation, group] of groups) {
    for (const person of group) {
      positions.set(person.id, {
        x: FAMILY_LAYOUT.paddingX + (xByPerson.get(person.id) ?? 0) - minimumX,
        y: FAMILY_LAYOUT.paddingY + (generation + 2) * FAMILY_LAYOUT.verticalGap,
        generation,
      });
    }
  }

  return { groups, positions, xByPerson };
}
