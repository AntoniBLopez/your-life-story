import { describe, expect, it } from "vitest";
import { resolveParentSlots, type FamilyPerson, type FamilyRelationship } from "./family-graph";

const people: FamilyPerson[] = [
  { id: "child", userId: "u", fullName: "Laura López", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "female", baptized: null, notes: null, isSubject: false },
  { id: "mother", userId: "u", fullName: "Rosario Lopez", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "female", baptized: null, notes: null, isSubject: false },
  { id: "father", userId: "u", fullName: "Antoni Bassols", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "male", baptized: null, notes: null, isSubject: false },
];

const relationships: FamilyRelationship[] = [
  { id: "r1", userId: "u", sourcePersonId: "mother", targetPersonId: "child", relationshipType: "parent" },
  { id: "r2", userId: "u", sourcePersonId: "father", targetPersonId: "child", relationshipType: "parent" },
];

describe("resolveParentSlots", () => {
  it("maps parents to mother and father slots by gender", () => {
    expect(resolveParentSlots("child", relationships, people)).toEqual({
      motherId: "mother",
      fatherId: "father",
    });
  });
});
