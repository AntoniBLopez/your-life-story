import type { ObjectId } from "mongodb";
import type { BirthdayReminderOffset, BirthdayReminderPreset } from "../domain/birthday-reminder";
import { getDb } from "@/shared/lib/mongodb/client";
import { COLLECTIONS } from "@/shared/lib/mongodb/collections";
import { idFromDocument, toObjectId, tryToObjectId } from "@/shared/lib/mongodb/id";

type PresetDbRecord = {
  _id: ObjectId;
  userId: string;
  name: string;
  offsets: BirthdayReminderOffset[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const mapPreset = (row: PresetDbRecord): BirthdayReminderPreset => ({
  id: idFromDocument(row),
  userId: row.userId,
  name: row.name,
  offsets: row.offsets,
  isDefault: Boolean(row.isDefault),
});

export class MongoBirthdayReminderPresetRepository {
  private async db() {
    return getDb();
  }

  async listByUser(userId: string) {
    const db = await this.db();
    const rows = await db.collection<PresetDbRecord>(COLLECTIONS.birthdayReminderPresets)
      .find({ userId })
      .sort({ isDefault: -1, updatedAt: -1 })
      .toArray();
    return rows.map(mapPreset);
  }

  async findById(userId: string, presetId: string) {
    const id = tryToObjectId(presetId);
    if (!id) return null;
    const db = await this.db();
    const row = await db.collection<PresetDbRecord>(COLLECTIONS.birthdayReminderPresets).findOne({
      _id: id,
      userId,
    });
    return row ? mapPreset(row) : null;
  }

  async upsert(userId: string, input: { id?: string | null; name: string; offsets: BirthdayReminderOffset[]; isDefault?: boolean }) {
    const db = await this.db();
    const now = new Date();
    const existing = input.id ? await this.findById(userId, input.id) : null;
    const makeDefault = Boolean(input.isDefault) || (!existing && (await this.listByUser(userId)).length === 0);
    if (makeDefault) {
      await db.collection(COLLECTIONS.birthdayReminderPresets).updateMany({ userId }, { $set: { isDefault: false } });
    }

    if (existing) {
      const result = await db.collection<PresetDbRecord>(COLLECTIONS.birthdayReminderPresets).findOneAndUpdate(
        { _id: toObjectId(existing.id), userId },
        { $set: { name: input.name, offsets: input.offsets, isDefault: makeDefault || existing.isDefault, updatedAt: now } },
        { returnDocument: "after" },
      );
      if (!result) throw new Error("Reminder preset not found.");
      return { preset: mapPreset(result), created: false, previousOffsets: existing.offsets };
    }

    const record = {
      userId,
      name: input.name,
      offsets: input.offsets,
      isDefault: makeDefault,
      createdAt: now,
      updatedAt: now,
    };
    const { insertedId } = await db.collection(COLLECTIONS.birthdayReminderPresets).insertOne(record);
    return { preset: mapPreset({ _id: insertedId, ...record }), created: true, previousOffsets: [] as BirthdayReminderOffset[] };
  }

  async deleteIfUnused(userId: string, presetId: string) {
    const db = await this.db();
    const used = await db.collection(COLLECTIONS.familyPeople).countDocuments({ userId, birthdayReminderPresetId: presetId });
    if (used > 0) return { deleted: false, used };
    await db.collection(COLLECTIONS.birthdayReminderPresets).deleteOne({ _id: toObjectId(presetId), userId });
    return { deleted: true, used: 0 };
  }
}
