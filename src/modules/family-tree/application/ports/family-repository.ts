import type { FamilyPerson, FamilyRelationship } from "../../domain/family-graph";

export interface FamilyRepository {
  listPeople(userId: string): Promise<FamilyPerson[]>;
  listRelationships(userId: string): Promise<FamilyRelationship[]>;
  addPerson(userId: string, person: Omit<FamilyPerson, "id" | "userId">): Promise<FamilyPerson>;
  updatePerson(userId: string, personId: string, person: Omit<FamilyPerson, "id" | "userId">): Promise<FamilyPerson>;
  addRelationship(userId: string, relationship: Omit<FamilyRelationship, "id" | "userId">): Promise<void>;
  clearAll(userId: string): Promise<void>;
}
