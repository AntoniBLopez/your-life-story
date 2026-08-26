import { env } from "@/shared/lib/env";
import { demoEntries } from "@/shared/lib/demo-data";
import { MongoLifeEntryRepository } from "../infrastructure/mongo-life-entry-repository";

const repository = new MongoLifeEntryRepository();

export async function listLifeEntriesForUser(userId: string) {
  if (env.demoMode) return demoEntries.filter((entry) => entry.userId === userId);
  return repository.listByUser(userId);
}

export async function getLifeEntryForUser(userId: string, entryId: string) {
  if (env.demoMode) return demoEntries.find((entry) => entry.userId === userId && entry.id === entryId) ?? null;
  return repository.findById(userId, entryId);
}

export async function getLinkForEntry(userId: string, entryId: string) {
  if (env.demoMode) return null;
  return repository.findLinkBySource(userId, entryId);
}
