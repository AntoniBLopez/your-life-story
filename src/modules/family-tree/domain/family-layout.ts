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

function parentsOf(personId: string, relationships: FamilyRelationship[]) {
  return relationships
    .filter((item) => item.relationshipType === "parent" && item.targetPersonId === personId)
    .map((item) => item.sourcePersonId);
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

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function nextFreeSlot(used: number[], preferred: number, gap: number) {
  let candidate = preferred;
  const isTaken = (value: number) => used.some((item) => Math.abs(item - value) < gap * 0.75);
  if (!isTaken(candidate)) return candidate;
  for (let step = 1; step < 40; step += 1) {
    candidate = preferred + step * gap;
    if (!isTaken(candidate)) return candidate;
    candidate = preferred - step * gap;
    if (!isTaken(candidate)) return candidate;
  }
  return preferred + used.length * gap;
}

function getPersonLevel(personId: string, groups: Map<number, FamilyPerson[]>) {
  for (const [level, group] of groups) {
    if (group.some((person) => person.id === personId)) return level;
  }
  return 0;
}

function coParentsAtLevel(personId: string, level: number, groups: Map<number, FamilyPerson[]>, relationships: FamilyRelationship[]) {
  const result = new Set<string>();
  for (const childId of childrenOf(personId, relationships)) {
    for (const parentId of parentsOf(childId, relationships)) {
      if (parentId === personId) continue;
      if (getPersonLevel(parentId, groups) === level) result.add(parentId);
    }
  }
  for (const partnerId of partnersOf(personId, relationships)) {
    if (getPersonLevel(partnerId, groups) === level) result.add(partnerId);
  }
  return [...result];
}

function placeFamilyUnit(
  members: string[],
  childIds: string[],
  xByPerson: Map<string, number>,
  usedInLevel: number[],
  people: FamilyPerson[],
  gap: number,
) {
  const unplaced = members.filter((member) => !xByPerson.has(member));
  if (unplaced.length === 0) return;

  const childXs = childIds.map((childId) => xByPerson.get(childId)).filter((value): value is number => value !== undefined);
  const centerX = childXs.length > 0 ? average(childXs) : 0;
  const ordered = sortPeopleByBirthDate(people.filter((person) => unplaced.includes(person.id)));
  const unitWidth = (ordered.length - 1) * gap;
  let cursor = centerX - unitWidth / 2;

  for (const person of ordered) {
    const slot = nextFreeSlot(usedInLevel, cursor, gap);
    xByPerson.set(person.id, slot);
    usedInLevel.push(slot);
    cursor += gap;
  }
}

/** Pyramid layout: generations stacked vertically, each row centered, parents above their children. */
export function assignPyramidPositions(
  groups: Map<number, FamilyPerson[]>,
  relationships: FamilyRelationship[],
  people: FamilyPerson[],
  gap = FAMILY_LAYOUT.horizontalGap,
) {
  const xByPerson = new Map<string, number>();
  const levels = [...groups.keys()].sort((left, right) => right - left);

  for (const level of levels) {
    const group = sortPeopleByBirthDate(groups.get(level) ?? []);
    const usedInLevel: number[] = [];

    for (const person of group) {
      if (xByPerson.has(person.id)) continue;
      const childIds = childrenOf(person.id, relationships).filter((childId) => xByPerson.has(childId));
      if (childIds.length === 0) continue;
      const unit = [person.id, ...coParentsAtLevel(person.id, level, groups, relationships)];
      placeFamilyUnit(unit, childIds, xByPerson, usedInLevel, people, gap);
    }

    for (const person of group) {
      if (xByPerson.has(person.id)) continue;
      const parentIds = parentsOf(person.id, relationships).filter((parentId) => xByPerson.has(parentId));
      if (parentIds.length > 0) {
        const slot = nextFreeSlot(usedInLevel, average(parentIds.map((parentId) => xByPerson.get(parentId)!)), gap);
        xByPerson.set(person.id, slot);
        usedInLevel.push(slot);
      }
    }

    const unplaced = group.filter((person) => !xByPerson.has(person.id));
    if (unplaced.length > 0) {
      const rowWidth = (unplaced.length - 1) * gap;
      let cursor = -rowWidth / 2;
      for (const person of unplaced) {
        const slot = nextFreeSlot(usedInLevel, cursor, gap);
        xByPerson.set(person.id, slot);
        usedInLevel.push(slot);
        cursor += gap;
      }
    }
  }

  const values = [...xByPerson.values()];
  if (values.length === 0) return xByPerson;
  const center = (Math.min(...values) + Math.max(...values)) / 2;
  for (const [personId, x] of xByPerson) xByPerson.set(personId, x - center);

  return xByPerson;
}

/** @deprecated Use assignPyramidPositions */
export function assignHorizontalPositions(groups: Map<number, FamilyPerson[]>, horizontalGap = FAMILY_LAYOUT.horizontalGap) {
  const people = [...groups.values()].flat();
  return assignPyramidPositions(groups, [], people, horizontalGap);
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
  const xByPerson = assignPyramidPositions(groups, relationships, people);
  const minLevel = Math.min(...groups.keys());
  const positions = new Map<string, { x: number; y: number; generation: number }>();

  for (const [generation, group] of groups) {
    const rowIndex = generation - minLevel;
    for (const person of group) {
      positions.set(person.id, {
        x: xByPerson.get(person.id) ?? 0,
        y: FAMILY_LAYOUT.paddingY + rowIndex * FAMILY_LAYOUT.verticalGap,
        generation,
      });
    }
  }

  return { groups, positions, xByPerson };
}
