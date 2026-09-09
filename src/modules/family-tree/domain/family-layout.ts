import { impliedCoParentPairs, inferGender, type FamilyPerson, type FamilyRelationship } from "./family-graph";

export const FAMILY_LAYOUT = {
  horizontalGap: 290,
  verticalGap: 190,
  nodeWidth: 224,
  paddingX: 80,
  paddingY: 110,
  initialZoom: 0.95,
  nodeFocusHeight: 120,
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

function placeSiblingRowUnderAnchor(
  siblingIds: string[],
  anchorX: number,
  xByPerson: Map<string, number>,
  usedInLevel: number[],
  people: FamilyPerson[],
  gap: number,
) {
  const ordered = sortPeopleByBirthDate(people.filter((person) => siblingIds.includes(person.id)));
  if (ordered.length === 0) return;
  const rowWidth = (ordered.length - 1) * gap;
  let cursor = anchorX - rowWidth / 2;
  for (const person of ordered) {
    const slot = nextFreeSlot(usedInLevel, cursor, gap);
    xByPerson.set(person.id, slot);
    usedInLevel.push(slot);
    cursor += gap;
  }
}

function primaryParentId(
  childId: string,
  relationships: FamilyRelationship[],
  peopleById: Map<string, FamilyPerson>,
) {
  const parentIds = parentsOf(childId, relationships);
  const motherId = parentIds.find((parentId) => inferGender(peopleById.get(parentId) ?? { fullName: "", gender: null }) === "female");
  return motherId ?? parentIds[0];
}

/** Pyramid layout: generations stacked vertically, children centered under their mother. */
export function assignPyramidPositions(
  groups: Map<number, FamilyPerson[]>,
  relationships: FamilyRelationship[],
  people: FamilyPerson[],
  gap = FAMILY_LAYOUT.horizontalGap,
) {
  const xByPerson = new Map<string, number>();
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const levels = [...groups.keys()].sort((left, right) => left - right);

  for (const level of levels) {
    const group = sortPeopleByBirthDate(groups.get(level) ?? []);
    const usedInLevel: number[] = [];
    const unplacedAtLevel = group.filter((person) => !xByPerson.has(person.id));
    const claimed = new Set<string>();

    for (const person of unplacedAtLevel) {
      if (claimed.has(person.id)) continue;
      const coParents = coParentsAtLevel(person.id, level, groups, relationships)
        .filter((parentId) => !xByPerson.has(parentId) && unplacedAtLevel.some((item) => item.id === parentId));
      const unit = [person.id, ...coParents];
      unit.forEach((memberId) => claimed.add(memberId));

      const placedChildIds = childrenOf(person.id, relationships)
        .filter((childId) => getPersonLevel(childId, groups) > level && xByPerson.has(childId));

      if (placedChildIds.length > 0) {
        placeFamilyUnit(unit, placedChildIds, xByPerson, usedInLevel, people, gap);
        continue;
      }

      const pendingUnit = unit.filter((memberId) => !xByPerson.has(memberId));
      const hasParentsAbove = parentsOf(person.id, relationships)
        .some((parentId) => getPersonLevel(parentId, groups) < level);
      if (pendingUnit.length < 2 || hasParentsAbove) continue;

      const ordered = sortPeopleByBirthDate(people.filter((item) => pendingUnit.includes(item.id)));
      const rowWidth = (ordered.length - 1) * gap;
      let cursor = -rowWidth / 2;
      for (const member of ordered) {
        const slot = nextFreeSlot(usedInLevel, cursor, gap);
        xByPerson.set(member.id, slot);
        usedInLevel.push(slot);
        cursor += gap;
      }
    }

    const childrenStillUnplaced = group.filter((person) => !xByPerson.has(person.id));
    const siblingsByParent = new Map<string, string[]>();
    for (const child of childrenStillUnplaced) {
      const anchorId = primaryParentId(child.id, relationships, peopleById);
      if (!anchorId || !xByPerson.has(anchorId)) continue;
      siblingsByParent.set(anchorId, [...(siblingsByParent.get(anchorId) ?? []), child.id]);
    }
    for (const [anchorId, siblingIds] of siblingsByParent) {
      const pending = siblingIds.filter((childId) => !xByPerson.has(childId));
      if (pending.length === 0) continue;
      placeSiblingRowUnderAnchor(pending, xByPerson.get(anchorId)!, xByPerson, usedInLevel, people, gap);
    }

    for (const person of group) {
      if (xByPerson.has(person.id)) continue;
      const parentIds = parentsOf(person.id, relationships).filter((parentId) => xByPerson.has(parentId));
      if (parentIds.length === 0) continue;
      const slot = nextFreeSlot(usedInLevel, average(parentIds.map((parentId) => xByPerson.get(parentId)!)), gap);
      xByPerson.set(person.id, slot);
      usedInLevel.push(slot);
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

export type PartnerLink = {
  id: string;
  source: string;
  target: string;
};

/** Partner links for display: inferred when two people are mother and father of the same child. */
export function listPartnerLinks(relationships: FamilyRelationship[]): PartnerLink[] {
  return [...impliedCoParentPairs(relationships)].map((pair, index) => {
    const [source, target] = pair.split("::");
    return { id: `co-parent-${index}`, source, target };
  });
}

/** Only mothers connect to children when a mother exists; otherwise keep all parent links. */
export function filterParentEdgesForDisplay(
  relationships: FamilyRelationship[],
  people: FamilyPerson[],
): FamilyRelationship[] {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const parentRelationships = relationships.filter((relationship) => relationship.relationshipType === "parent");
  const byChild = new Map<string, FamilyRelationship[]>();

  for (const relationship of parentRelationships) {
    byChild.set(relationship.targetPersonId, [...(byChild.get(relationship.targetPersonId) ?? []), relationship]);
  }

  const visible: FamilyRelationship[] = [];
  for (const childRelationships of byChild.values()) {
    const mothers = childRelationships.filter((relationship) => {
      const parent = peopleById.get(relationship.sourcePersonId);
      return inferGender(parent ?? { fullName: "", gender: null }) === "female";
    });
    visible.push(...(mothers.length > 0 ? mothers : childRelationships));
  }

  return visible;
}

export function orientPartnerEdge(
  sourceId: string,
  targetId: string,
  positions: Map<string, { x: number; y: number }>,
) {
  const sourceX = positions.get(sourceId)?.x ?? 0;
  const targetX = positions.get(targetId)?.x ?? 0;
  if (sourceX <= targetX) {
    return { source: sourceId, target: targetId, sourceHandle: "right", targetHandle: "left" };
  }
  return { source: targetId, target: sourceId, sourceHandle: "right", targetHandle: "left" };
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

export function mergeSavedLayoutPositions(
  autoPositions: Map<string, { x: number; y: number; generation: number }>,
  people: FamilyPerson[],
) {
  const merged = new Map(autoPositions);
  for (const person of people) {
    if (person.layoutX == null || person.layoutY == null) continue;
    const current = merged.get(person.id);
    if (!current) continue;
    merged.set(person.id, {
      x: person.layoutX,
      y: person.layoutY,
      generation: current.generation,
    });
  }
  return merged;
}
