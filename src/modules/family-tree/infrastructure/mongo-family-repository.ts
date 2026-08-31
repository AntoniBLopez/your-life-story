import type { ObjectId } from "mongodb";
import { normalizePersonEmail, type FamilyPerson, type FamilyRelationship } from "../domain/family-graph";
import type { FamilyRepository } from "../application/ports/family-repository";
import { getDb } from "@/shared/lib/mongodb/client";
import { COLLECTIONS } from "@/shared/lib/mongodb/collections";
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
  isSubject: boolean;
  layoutX?: number | null;
  layoutY?: number | null;
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
  isSubject: row.isSubject,
  layoutX: row.layoutX ?? null,
  layoutY: row.layoutY ?? null,
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
    return rows.map(mapRelationship);
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
      isSubject: person.isSubject,
      layoutX: person.layoutX ?? null,
      layoutY: person.layoutY ?? null,
      createdAt: now,
      updatedAt: now,
    };
    const { insertedId } = await db.collection(COLLECTIONS.familyPeople).insertOne(record);
    return mapPerson({ _id: insertedId, ...record });
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
          isSubject: person.isSubject,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );
    if (!result) throw new Error("Family person not found.");
    return mapPerson(result);
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

  async clearAll(userId: string) {
    const db = await this.db();
    await db.collection(COLLECTIONS.familyRelationships).deleteMany({ userId });
    await db.collection(COLLECTIONS.familyPeople).deleteMany({ userId });
  }
}
