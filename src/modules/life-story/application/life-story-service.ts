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
