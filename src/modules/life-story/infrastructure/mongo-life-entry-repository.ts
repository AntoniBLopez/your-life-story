import type { ObjectId } from "mongodb";
import type { LifeEntry, LifeEntryLink } from "../domain/life-entry";
import type { LifeEntryInput } from "../application/life-entry-schema";
import type { LifeEntryRepository } from "../application/ports/life-entry-repository";
import { getDb } from "@/shared/lib/mongodb/client";
import { COLLECTIONS } from "@/shared/lib/mongodb/collections";
import { deleteAttachmentsForEntry } from "@/shared/lib/mongodb/attachments";
import { idFromDocument, toObjectId } from "@/shared/lib/mongodb/id";

type LifeEntryDbRecord = {
  _id: ObjectId;
  userId: string;
  startDate: string;
  endDate: string | null;
  datePrecision: LifeEntry["datePrecision"];
  title: string;
  narrative: string | null;
  lifeArea: LifeEntry["lifeArea"];
  lifeAreas: LifeEntry["lifeArea"][];
  changeDirection: LifeEntry["changeDirection"];
  momentFlags?: LifeEntry["momentFlags"];
  difficulty: string | null;
  learning: string | null;
  transformation: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

type LifeEntryLinkDbRecord = {
  _id: ObjectId;
  userId: string;
  sourceEntryId: string;
  targetEntryId: string;
  relation: LifeEntryLink["relation"];
  createdAt: Date;
};

function mapEntry(row: LifeEntryDbRecord): LifeEntry {
  return {
    id: idFromDocument(row),
    userId: row.userId,
    startDate: row.startDate,
    endDate: row.endDate,
    datePrecision: row.datePrecision,
    title: row.title,
    narrative: row.narrative,
    lifeArea: row.lifeArea,
    lifeAreas: row.lifeAreas ?? [row.lifeArea],
    changeDirection: row.changeDirection,
    momentFlags: row.momentFlags ?? [],
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
    const rows = await db.collection<LifeEntryDbRecord>(COLLECTIONS.lifeEntries)
      .find({ userId })
      .sort({ startDate: 1, createdAt: 1 })
      .toArray();
    return rows.map(mapEntry);
  }

  async findById(userId: string, entryId: string) {
    const db = await this.db();
    const row = await db.collection<LifeEntryDbRecord>(COLLECTIONS.lifeEntries).findOne({ _id: toObjectId(entryId), userId });
    return row ? mapEntry(row) : null;
  }

  async create(userId: string, input: LifeEntryInput) {
    const db = await this.db();
    const now = new Date();
    const record = {
      userId,
      startDate: input.startDate,
      endDate: input.endDate,
      datePrecision: input.datePrecision,
      title: input.title,
      narrative: input.narrative,
      lifeArea: input.lifeAreas[0],
      lifeAreas: input.lifeAreas,
      changeDirection: input.changeDirection,
      momentFlags: input.momentFlags,
      difficulty: input.difficulty,
      learning: input.learning,
      transformation: input.transformation,
      tags: input.tags,
      createdAt: now,
      updatedAt: now,
    };
    const { insertedId } = await db.collection(COLLECTIONS.lifeEntries).insertOne(record);
    return mapEntry({ _id: insertedId, ...record });
  }

  async update(userId: string, entryId: string, input: LifeEntryInput) {
    const db = await this.db();
    const now = new Date();
    const result = await db.collection<LifeEntryDbRecord>(COLLECTIONS.lifeEntries).findOneAndUpdate(
      { _id: toObjectId(entryId), userId },
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
          momentFlags: input.momentFlags,
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
    const result = await db.collection(COLLECTIONS.lifeEntries).deleteOne({ _id: toObjectId(entryId), userId });
    if (result.deletedCount === 0) throw new Error("Life entry not found.");
  }

  async createLink(userId: string, sourceEntryId: string, targetEntryId: string, relation: LifeEntryLink["relation"]) {
    if (sourceEntryId === targetEntryId) throw new Error("An entry cannot link to itself.");
    const db = await this.db();
    await db.collection(COLLECTIONS.lifeEntryLinks).insertOne({
      userId,
      sourceEntryId,
      targetEntryId,
      relation,
      createdAt: new Date(),
    });
  }

  async replaceLink(userId: string, sourceEntryId: string, targetEntryId: string | null, relation: LifeEntryLink["relation"]) {
    const db = await this.db();
    await db.collection(COLLECTIONS.lifeEntryLinks).deleteMany({ userId, sourceEntryId });
    if (targetEntryId) await this.createLink(userId, sourceEntryId, targetEntryId, relation);
  }

  async findLinkBySource(userId: string, sourceEntryId: string) {
    const db = await this.db();
    const row = await db.collection<LifeEntryLinkDbRecord>(COLLECTIONS.lifeEntryLinks).findOne({ userId, sourceEntryId });
    if (!row) return null;
    return { id: idFromDocument(row), sourceEntryId: row.sourceEntryId, targetEntryId: row.targetEntryId, relation: row.relation };
  }

  async listLinksByUser(userId: string) {
    const db = await this.db();
    const rows = await db.collection<LifeEntryLinkDbRecord>(COLLECTIONS.lifeEntryLinks).find({ userId }).toArray();
    return rows.map((row) => ({
      id: idFromDocument(row),
      sourceEntryId: row.sourceEntryId,
      targetEntryId: row.targetEntryId,
      relation: row.relation,
    }));
  }
}
