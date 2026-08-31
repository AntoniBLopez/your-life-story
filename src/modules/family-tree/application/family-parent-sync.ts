import { assertNoParentCycle } from "../domain/family-graph";
import type { FamilyRepository } from "./ports/family-repository";

export async function syncPersonParents(
  repository: FamilyRepository,
  userId: string,
  childId: string,
  motherId: string | null,
  fatherId: string | null,
) {
  if (motherId === childId || fatherId === childId) {
    throw new Error("Una persona no puede ser su propio progenitor.");
  }
  if (motherId && fatherId && motherId === fatherId) {
    throw new Error("La madre y el padre deben ser personas distintas.");
  }

  const parentIds = [...new Set([motherId, fatherId].filter((id): id is string => Boolean(id)))];
  const relationships = await repository.listRelationships(userId);

  for (const parentId of parentIds) {
    assertNoParentCycle(relationships, parentId, childId);
  }

  const existing = relationships.filter(
    (relationship) => relationship.relationshipType === "parent" && relationship.targetPersonId === childId,
  );
  const existingParentIds = new Set(existing.map((relationship) => relationship.sourcePersonId));
  const desiredParentIds = new Set(parentIds);

  await Promise.all(
    existing
      .filter((relationship) => !desiredParentIds.has(relationship.sourcePersonId))
      .map((relationship) => repository.deleteRelationship(userId, relationship.id)),
  );

  await Promise.all(
    parentIds
      .filter((parentId) => !existingParentIds.has(parentId))
      .map((parentId) =>
        repository.addRelationship(userId, {
          sourcePersonId: parentId,
          targetPersonId: childId,
          relationshipType: "parent",
        }),
      ),
  );
}
