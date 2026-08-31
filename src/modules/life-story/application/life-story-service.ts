import { MongoLifeEntryRepository } from "../infrastructure/mongo-life-entry-repository";

const repository = new MongoLifeEntryRepository();

export async function listLifeEntriesForUser(userId: string) {
  return repository.listByUser(userId);
}

export async function getLifeEntryForUser(userId: string, entryId: string) {
  return repository.findById(userId, entryId);
}

export async function getLinkForEntry(userId: string, entryId: string) {
  return repository.findLinkBySource(userId, entryId);
}

export async function listLifeEntryLinksForUser(userId: string) {
  return repository.listLinksByUser(userId);
}

export async function duplicateLifeStoryForUser(sourceUserId: string, targetUserId: string) {
  const [entries, links] = await Promise.all([repository.listByUser(sourceUserId), repository.listLinksByUser(sourceUserId)]);
  const idBySource = new Map<string, string>();
  for (const entry of entries) {
    const copied = await repository.create(targetUserId, {
      startDate: entry.startDate,
      endDate: entry.endDate,
      datePrecision: entry.datePrecision,
      title: entry.title,
      narrative: entry.narrative,
      lifeAreas: entry.lifeAreas.length > 0 ? entry.lifeAreas : [entry.lifeArea],
      changeDirection: entry.changeDirection,
      momentFlags: entry.momentFlags,
      difficulty: entry.difficulty,
      learning: entry.learning,
      transformation: entry.transformation,
      tags: entry.tags,
      linkedEntryId: null,
      linkType: "related",
    });
    idBySource.set(entry.id, copied.id);
  }
  for (const link of links) {
    const sourceEntryId = idBySource.get(link.sourceEntryId);
    const targetEntryId = idBySource.get(link.targetEntryId);
    if (!sourceEntryId || !targetEntryId) continue;
    await repository.createLink(targetUserId, sourceEntryId, targetEntryId, link.relation);
  }
  return { entries: idBySource.size };
}
