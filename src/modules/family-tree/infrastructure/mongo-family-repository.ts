import type { FamilyPerson, FamilyRelationship } from "../domain/family-graph";
import type { FamilyRepository } from "../application/ports/family-repository";
import { getDb } from "@/shared/lib/mongodb/client";
import { COLLECTIONS } from "@/shared/lib/mongodb/collections";

type FamilyPersonRecord = {
  id: string;
  userId: string;
  fullName: string;
  birthDate: string | null;
  birthDatePrecision: FamilyPerson["birthDatePrecision"];
  deathDate: string | null;
  deathDatePrecision: FamilyPerson["deathDatePrecision"];
  birthCountry: string | null;
  birthCity: string | null;
  isSubject: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type FamilyRelationshipRecord = {
  id: string;
  userId: string;
  sourcePersonId: string;
  targetPersonId: string;
  relationshipType: FamilyRelationship["relationshipType"];
  createdAt: Date;
};

const mapPerson = (row: FamilyPersonRecord): FamilyPerson => ({
  id: row.id,
  userId: row.userId,
  fullName: row.fullName,
  birthDate: row.birthDate,
  birthDatePrecision: row.birthDatePrecision,
  deathDate: row.deathDate,
  deathDatePrecision: row.deathDatePrecision,
  birthCountry: row.birthCountry,
  birthCity: row.birthCity,
  isSubject: row.isSubject,
});

const mapRelationship = (row: FamilyRelationshipRecord): FamilyRelationship => ({
  id: row.id,
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
    const rows = await db.collection<FamilyPersonRecord>(COLLECTIONS.familyPeople).find({ userId }).sort({ fullName: 1 }).toArray();
    return rows.map(mapPerson);
  }

  async listRelationships(userId: string) {
    const db = await this.db();
    const rows = await db.collection<FamilyRelationshipRecord>(COLLECTIONS.familyRelationships).find({ userId }).toArray();
    return rows.map(mapRelationship);
  }

  async addPerson(userId: string, person: Omit<FamilyPerson, "id" | "userId">) {
    const db = await this.db();
    if (person.isSubject) {
      await db.collection(COLLECTIONS.familyPeople).updateMany({ userId }, { $set: { isSubject: false } });
    }
    const now = new Date();
    const record: FamilyPersonRecord = {
      id: crypto.randomUUID(),
      userId,
      fullName: person.fullName,
      birthDate: person.birthDate,
      birthDatePrecision: person.birthDatePrecision,
      deathDate: person.deathDate,
      deathDatePrecision: person.deathDatePrecision,
      birthCountry: person.birthCountry,
      birthCity: person.birthCity,
      isSubject: person.isSubject,
      createdAt: now,
      updatedAt: now,
    };
    await db.collection(COLLECTIONS.familyPeople).insertOne(record);
    return mapPerson(record);
  }

  async updatePerson(userId: string, personId: string, person: Omit<FamilyPerson, "id" | "userId">) {
    const db = await this.db();
    if (person.isSubject) {
      await db.collection(COLLECTIONS.familyPeople).updateMany({ userId }, { $set: { isSubject: false } });
    }
    const result = await db.collection<FamilyPersonRecord>(COLLECTIONS.familyPeople).findOneAndUpdate(
      { id: personId, userId },
      {
        $set: {
          fullName: person.fullName,
          birthDate: person.birthDate,
          birthDatePrecision: person.birthDatePrecision,
          deathDate: person.deathDate,
          deathDatePrecision: person.deathDatePrecision,
          birthCountry: person.birthCountry,
          birthCity: person.birthCity,
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
    const record: FamilyRelationshipRecord = {
      id: crypto.randomUUID(),
      userId,
      sourcePersonId: relationship.sourcePersonId,
      targetPersonId: relationship.targetPersonId,
      relationshipType: relationship.relationshipType,
      createdAt: new Date(),
    };
    await db.collection(COLLECTIONS.familyRelationships).insertOne(record);
  }
}
