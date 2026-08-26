import type { LifeEntry, LifeEntryLink } from "../../domain/life-entry";
import type { LifeEntryInput } from "../life-entry-schema";

export interface LifeEntryRepository {
  listByUser(userId: string): Promise<LifeEntry[]>;
  findById(userId: string, entryId: string): Promise<LifeEntry | null>;
  create(userId: string, input: LifeEntryInput): Promise<LifeEntry>;
  update(userId: string, entryId: string, input: LifeEntryInput): Promise<LifeEntry>;
  delete(userId: string, entryId: string): Promise<void>;
  createLink(userId: string, sourceEntryId: string, targetEntryId: string, relation: LifeEntryLink["relation"]): Promise<void>;
  replaceLink(userId: string, sourceEntryId: string, targetEntryId: string | null, relation: LifeEntryLink["relation"]): Promise<void>;
  findLinkBySource(userId: string, sourceEntryId: string): Promise<LifeEntryLink | null>;
}
