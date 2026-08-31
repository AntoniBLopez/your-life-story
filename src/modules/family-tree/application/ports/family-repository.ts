import type { FamilyPerson, FamilyRelationship } from "../../domain/family-graph";

export interface FamilyRepository {
  listPeople(userId: string): Promise<FamilyPerson[]>;
  listRelationships(userId: string): Promise<FamilyRelationship[]>;
  listPeopleByInviteEmail(email: string): Promise<FamilyPerson[]>;
  addPerson(userId: string, person: Omit<FamilyPerson, "id" | "userId">): Promise<FamilyPerson>;
  updatePerson(userId: string, personId: string, person: Omit<FamilyPerson, "id" | "userId">): Promise<FamilyPerson>;
  addRelationship(userId: string, relationship: Omit<FamilyRelationship, "id" | "userId">): Promise<void>;
  deleteRelationship(userId: string, relationshipId: string): Promise<void>;
  updatePeopleLayout(userId: string, layouts: { personId: string; layoutX: number; layoutY: number }[]): Promise<void>;
  clearAll(userId: string): Promise<void>;
}
