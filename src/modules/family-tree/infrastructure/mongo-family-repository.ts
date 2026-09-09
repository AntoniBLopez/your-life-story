import type { ObjectId } from "mongodb";
import { normalizePersonEmail, type FamilyPerson, type FamilyRelationship } from "../domain/family-graph";
import type { FamilyRepository } from "../application/ports/family-repository";
import { getDb } from "@/shared/lib/mongodb/client";
import { COLLECTIONS } from "@/shared/lib/mongodb/collections";
import { deleteFamilyAvatar, deleteFamilyAvatars } from "@/shared/lib/mongodb/family-avatars";
import { idFromDocument, toObjectId } from "@/shared/lib/mongodb/id";

type FamilyPersonDbRecord = {
  _id: ObjectId;
  userId: string;
  fullName: string;
  birthDate: string | null;
  birthDatePrecision: FamilyPerson["birthDatePrecision"];
  deathDate: string | null;
  deathDatePrecision: FamilyPerson["deathDatePrecision"];
  birthCountry: string | null;
  birthCity: string | null;
  gender: FamilyPerson["gender"];
  baptized: FamilyPerson["baptized"];
  notes: FamilyPerson["notes"];
  email?: string | null;
  canReadTimeline?: boolean;
  birthdayReminderEnabled?: boolean;
  birthdayReminderPresetId?: string | null;
  googleCalendarEventIds?: { offsetKey: string; eventId: string }[];
  isSubject: boolean;
  layoutX?: number | null;
  layoutY?: number | null;
  avatarGridFsId?: string | null;
  avatarMimeType?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type FamilyRelationshipDbRecord = {
  _id: ObjectId;
  userId: string;
  sourcePersonId: string;
  targetPersonId: string;
  relationshipType: FamilyRelationship["relationshipType"];
  createdAt: Date;
};

const mapPerson = (row: FamilyPersonDbRecord): FamilyPerson => ({
  id: idFromDocument(row),
  userId: row.userId,
  fullName: row.fullName,
  birthDate: row.birthDate,
  birthDatePrecision: row.birthDatePrecision,
  deathDate: row.deathDate,
  deathDatePrecision: row.deathDatePrecision,
  birthCountry: row.birthCountry,
  birthCity: row.birthCity,
  gender: row.gender ?? null,
  baptized: row.baptized ?? null,
  notes: row.notes ?? null,
  email: row.email ?? null,
  canReadTimeline: Boolean(row.canReadTimeline),
  birthdayReminderEnabled: Boolean(row.birthdayReminderEnabled),
  birthdayReminderPresetId: row.birthdayReminderPresetId ?? null,
  googleCalendarEventIds: row.googleCalendarEventIds ?? [],
  isSubject: row.isSubject,
  layoutX: row.layoutX ?? null,
  layoutY: row.layoutY ?? null,
  avatarGridFsId: row.avatarGridFsId ?? null,
  avatarMimeType: row.avatarMimeType ?? null,
});

const mapRelationship = (row: FamilyRelationshipDbRecord): FamilyRelationship => ({
  id: idFromDocument(row),
  userId: row.userId,
  sourcePersonId: row.sourcePersonId,
  targetPersonId: row.targetPersonId,
  relationshipType: row.relationshipType,
});

export class MongoFamilyRepository implements FamilyRepository {
  private async db() {
    return getDb();
  }

  async listPeople(userId: string) {
    const db = await this.db();
    const rows = await db.collection<FamilyPersonDbRecord>(COLLECTIONS.familyPeople).find({ userId }).sort({ fullName: 1 }).toArray();
    return rows.map(mapPerson);
  }

  async findPersonById(userId: string, personId: string) {
    const db = await this.db();
    const row = await db.collection<FamilyPersonDbRecord>(COLLECTIONS.familyPeople).findOne({ _id: toObjectId(personId), userId });
    return row ? mapPerson(row) : null;
  }

  async findPersonByPersonId(personId: string) {
    const db = await this.db();
    const row = await db.collection<FamilyPersonDbRecord>(COLLECTIONS.familyPeople).findOne({ _id: toObjectId(personId) });
    return row ? mapPerson(row) : null;
  }

  async updatePersonBirthdayReminder(userId: string, personId: string, update: { birthdayReminderEnabled: boolean; birthdayReminderPresetId: string | null }) {
    const db = await this.db();
    const result = await db.collection<FamilyPersonDbRecord>(COLLECTIONS.familyPeople).findOneAndUpdate(
      { _id: toObjectId(personId), userId },
      {
        $set: {
          birthdayReminderEnabled: update.birthdayReminderEnabled,
          birthdayReminderPresetId: update.birthdayReminderPresetId,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );
    if (!result) throw new Error("Family person not found.");
    return mapPerson(result);
  }

  async listPeopleByInviteEmail(email: string) {
    const normalized = normalizePersonEmail(email);
    if (!normalized) return [];
    const db = await this.db();
    const rows = await db.collection<FamilyPersonDbRecord>(COLLECTIONS.familyPeople)
      .find({ email: normalized, canReadTimeline: true })
      .toArray();
    return rows.map(mapPerson);
  }

  async listRelationships(userId: string) {
    const db = await this.db();
    const rows = await db.collection<FamilyRelationshipDbRecord>(COLLECTIONS.familyRelationships).find({ userId }).toArray();
    return rows
      .filter((row) => (row.relationshipType as string) !== "partner")
      .map(mapRelationship);
  }

  async addPerson(userId: string, person: Omit<FamilyPerson, "id" | "userId">) {
    const db = await this.db();
    if (person.isSubject) {
      await db.collection(COLLECTIONS.familyPeople).updateMany({ userId }, { $set: { isSubject: false } });
    }
    const now = new Date();
    const record = {
      userId,
      fullName: person.fullName,
      birthDate: person.birthDate,
      birthDatePrecision: person.birthDatePrecision,
      deathDate: person.deathDate,
      deathDatePrecision: person.deathDatePrecision,
      birthCountry: person.birthCountry,
      birthCity: person.birthCity,
      gender: person.gender ?? null,
      baptized: person.baptized ?? null,
      notes: person.notes ?? null,
      email: normalizePersonEmail(person.email),
      canReadTimeline: Boolean(person.canReadTimeline && normalizePersonEmail(person.email) && !person.isSubject),
      birthdayReminderEnabled: Boolean(person.birthdayReminderEnabled),
      birthdayReminderPresetId: person.birthdayReminderPresetId ?? null,
      googleCalendarEventIds: person.googleCalendarEventIds ?? [],
      isSubject: person.isSubject,
      layoutX: person.layoutX ?? null,
      layoutY: person.layoutY ?? null,
      avatarGridFsId: person.avatarGridFsId ?? null,
      avatarMimeType: person.avatarMimeType ?? null,
      createdAt: now,
      updatedAt: now,
    };
    const { insertedId } = await db.collection(COLLECTIONS.familyPeople).insertOne(record);
    return mapPerson({ _id: insertedId, ...record });
  }

  async deletePerson(userId: string, personId: string) {
    const person = await this.findPersonById(userId, personId);
    if (!person) throw new Error("Family person not found.");
    await deleteFamilyAvatar(person.avatarGridFsId);
    const db = await this.db();
    await db.collection(COLLECTIONS.familyRelationships).deleteMany({
      userId,
      $or: [{ sourcePersonId: personId }, { targetPersonId: personId }],
    });
    const result = await db.collection(COLLECTIONS.familyPeople).deleteOne({ _id: toObjectId(personId), userId });
    if (result.deletedCount === 0) throw new Error("Family person not found.");
  }

  async updatePerson(userId: string, personId: string, person: Omit<FamilyPerson, "id" | "userId">) {
    const db = await this.db();
    if (person.isSubject) {
      await db.collection(COLLECTIONS.familyPeople).updateMany({ userId }, { $set: { isSubject: false } });
    }
    const result = await db.collection<FamilyPersonDbRecord>(COLLECTIONS.familyPeople).findOneAndUpdate(
      { _id: toObjectId(personId), userId },
      {
        $set: {
          fullName: person.fullName,
          birthDate: person.birthDate,
          birthDatePrecision: person.birthDatePrecision,
          deathDate: person.deathDate,
          deathDatePrecision: person.deathDatePrecision,
          birthCountry: person.birthCountry,
          birthCity: person.birthCity,
          gender: person.gender ?? null,
          baptized: person.baptized ?? null,
          notes: person.notes ?? null,
          email: normalizePersonEmail(person.email),
          canReadTimeline: Boolean(person.canReadTimeline && normalizePersonEmail(person.email) && !person.isSubject),
          birthdayReminderEnabled: Boolean(person.birthdayReminderEnabled),
          birthdayReminderPresetId: person.birthdayReminderPresetId ?? null,
          isSubject: person.isSubject,
          avatarGridFsId: person.avatarGridFsId ?? null,
          avatarMimeType: person.avatarMimeType ?? null,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );
    if (!result) throw new Error("Family person not found.");
    return mapPerson(result);
  }

  async updatePersonReminderEvents(userId: string, personId: string, events: FamilyPerson["googleCalendarEventIds"]) {
    const db = await this.db();
    const result = await db.collection<FamilyPersonDbRecord>(COLLECTIONS.familyPeople).findOneAndUpdate(
      { _id: toObjectId(personId), userId },
      { $set: { googleCalendarEventIds: events ?? [], updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!result) throw new Error("Family person not found.");
    return mapPerson(result);
  }

  async listPeopleWithBirthdayReminders(userId: string) {
    const db = await this.db();
    const rows = await db.collection<FamilyPersonDbRecord>(COLLECTIONS.familyPeople)
      .find({ userId, birthdayReminderEnabled: true })
      .toArray();
    return rows.map(mapPerson);
  }

  async listPeopleByReminderPreset(userId: string, presetId: string) {
    const db = await this.db();
    const rows = await db.collection<FamilyPersonDbRecord>(COLLECTIONS.familyPeople)
      .find({ userId, birthdayReminderPresetId: presetId })
      .toArray();
    return rows.map(mapPerson);
  }

  async addRelationship(userId: string, relationship: Omit<FamilyRelationship, "id" | "userId">) {
    const db = await this.db();
    await db.collection(COLLECTIONS.familyRelationships).insertOne({
      userId,
      sourcePersonId: relationship.sourcePersonId,
      targetPersonId: relationship.targetPersonId,
      relationshipType: relationship.relationshipType,
      createdAt: new Date(),
    });
  }

  async deleteRelationship(userId: string, relationshipId: string) {
    const db = await this.db();
    await db.collection(COLLECTIONS.familyRelationships).deleteOne({ _id: toObjectId(relationshipId), userId });
  }

  async updatePeopleLayout(
    userId: string,
    layouts: { personId: string; layoutX: number; layoutY: number }[],
  ) {
    if (layouts.length === 0) return;
    const db = await this.db();
    const now = new Date();
    await Promise.all(
      layouts.map(({ personId, layoutX, layoutY }) =>
        db.collection(COLLECTIONS.familyPeople).updateOne(
          { _id: toObjectId(personId), userId },
          { $set: { layoutX, layoutY, updatedAt: now } },
        ),
      ),
    );
  }

  async clearPeopleLayouts(userId: string) {
    const db = await this.db();
    await db.collection(COLLECTIONS.familyPeople).updateMany(
      { userId },
      { $set: { layoutX: null, layoutY: null, updatedAt: new Date() } },
    );
  }

  async clearAll(userId: string) {
    const people = await this.listPeople(userId);
    await deleteFamilyAvatars(people.map((person) => person.avatarGridFsId));
    const db = await this.db();
    await db.collection(COLLECTIONS.familyRelationships).deleteMany({ userId });
    await db.collection(COLLECTIONS.familyPeople).deleteMany({ userId });
  }
}
