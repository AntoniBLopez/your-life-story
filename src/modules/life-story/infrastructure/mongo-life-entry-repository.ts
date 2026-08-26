import type { LifeEntry, LifeEntryLink } from "../domain/life-entry";
import type { LifeEntryInput } from "../application/life-entry-schema";
import type { LifeEntryRepository } from "../application/ports/life-entry-repository";
import { getDb } from "@/shared/lib/mongodb/client";
import { COLLECTIONS } from "@/shared/lib/mongodb/collections";
import { deleteAttachmentsForEntry } from "@/shared/lib/mongodb/attachments";

type LifeEntryRecord = {
  id: string;
  userId: string;
  startDate: string;
  endDate: string | null;
  datePrecision: LifeEntry["datePrecision"];
  title: string;
  narrative: string | null;
  lifeArea: LifeEntry["lifeArea"];
  lifeAreas: LifeEntry["lifeArea"][];
  changeDirection: LifeEntry["changeDirection"];
  difficulty: string | null;
  learning: string | null;
  transformation: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

type LifeEntryLinkRecord = {
  id: string;
  userId: string;
  sourceEntryId: string;
  targetEntryId: string;
  relation: LifeEntryLink["relation"];
  createdAt: Date;
};

function mapEntry(row: LifeEntryRecord): LifeEntry {
  return {
    id: row.id,
    userId: row.userId,
    startDate: row.startDate,
    endDate: row.endDate,
    datePrecision: row.datePrecision,
    title: row.title,
    narrative: row.narrative,
    lifeArea: row.lifeArea,
    lifeAreas: row.lifeAreas ?? [row.lifeArea],
    changeDirection: row.changeDirection,
    difficulty: row.difficulty,
    learning: row.learning,
    transformation: row.transformation,
    tags: row.tags ?? [],
    createdAt: row.createdAt.toISOString(),
  };
}

export class MongoLifeEntryRepository implements LifeEntryRepository {
  private async db() {
    return getDb();
  }

  async listByUser(userId: string) {
    const db = await this.db();
    const rows = await db.collection<LifeEntryRecord>(COLLECTIONS.lifeEntries)
      .find({ userId })
      .sort({ startDate: 1, createdAt: 1 })
      .toArray();
    return rows.map(mapEntry);
  }

  async findById(userId: string, entryId: string) {
    const db = await this.db();
    const row = await db.collection<LifeEntryRecord>(COLLECTIONS.lifeEntries).findOne({ id: entryId, userId });
    return row ? mapEntry(row) : null;
  }

  async create(userId: string, input: LifeEntryInput) {
    const db = await this.db();
    const now = new Date();
    const record: LifeEntryRecord = {
      id: crypto.randomUUID(),
      userId,
      startDate: input.startDate,
      endDate: input.endDate,
      datePrecision: input.datePrecision,
      title: input.title,
      narrative: input.narrative,
      lifeArea: input.lifeAreas[0],
      lifeAreas: input.lifeAreas,
      changeDirection: input.changeDirection,
      difficulty: input.difficulty,
      learning: input.learning,
      transformation: input.transformation,
      tags: input.tags,
      createdAt: now,
      updatedAt: now,
    };
    await db.collection(COLLECTIONS.lifeEntries).insertOne(record);
    return mapEntry(record);
  }

  async update(userId: string, entryId: string, input: LifeEntryInput) {
    const db = await this.db();
    const now = new Date();
    const result = await db.collection<LifeEntryRecord>(COLLECTIONS.lifeEntries).findOneAndUpdate(
      { id: entryId, userId },
      {
        $set: {
          startDate: input.startDate,
          endDate: input.endDate,
          datePrecision: input.datePrecision,
          title: input.title,
          narrative: input.narrative,
          lifeArea: input.lifeAreas[0],
          lifeAreas: input.lifeAreas,
          changeDirection: input.changeDirection,
          difficulty: input.difficulty,
          learning: input.learning,
          transformation: input.transformation,
          tags: input.tags,
          updatedAt: now,
        },
      },
      { returnDocument: "after" },
    );
    if (!result) throw new Error("Life entry not found.");
    return mapEntry(result);
  }

  async delete(userId: string, entryId: string) {
    const db = await this.db();
    await deleteAttachmentsForEntry(userId, entryId);
    await db.collection(COLLECTIONS.lifeEntryLinks).deleteMany({ userId, $or: [{ sourceEntryId: entryId }, { targetEntryId: entryId }] });
    const result = await db.collection(COLLECTIONS.lifeEntries).deleteOne({ id: entryId, userId });
    if (result.deletedCount === 0) throw new Error("Life entry not found.");
  }

  async createLink(userId: string, sourceEntryId: string, targetEntryId: string, relation: LifeEntryLink["relation"]) {
    if (sourceEntryId === targetEntryId) throw new Error("An entry cannot link to itself.");
    const db = await this.db();
    const record: LifeEntryLinkRecord = {
      id: crypto.randomUUID(),
      userId,
      sourceEntryId,
      targetEntryId,
      relation,
      createdAt: new Date(),
    };
    await db.collection(COLLECTIONS.lifeEntryLinks).insertOne(record);
  }

  async replaceLink(userId: string, sourceEntryId: string, targetEntryId: string | null, relation: LifeEntryLink["relation"]) {
    const db = await this.db();
    await db.collection(COLLECTIONS.lifeEntryLinks).deleteMany({ userId, sourceEntryId });
    if (targetEntryId) await this.createLink(userId, sourceEntryId, targetEntryId, relation);
  }

  async findLinkBySource(userId: string, sourceEntryId: string) {
    const db = await this.db();
    const row = await db.collection<LifeEntryLinkRecord>(COLLECTIONS.lifeEntryLinks).findOne({ userId, sourceEntryId });
    if (!row) return null;
    return { id: row.id, sourceEntryId: row.sourceEntryId, targetEntryId: row.targetEntryId, relation: row.relation };
  }
}
