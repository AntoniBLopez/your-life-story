import { describe, expect, it } from "vitest";
import { assertParentRoleGenders, parentCandidatesForRole, resolveParentSlots, type FamilyPerson, type FamilyRelationship } from "./family-graph";

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

describe("parentCandidatesForRole", () => {
  it("hides men from the mother list and women from the father list", () => {
    const unknown: FamilyPerson = {
      id: "unknown",
      userId: "u",
      fullName: "Alex Rivera",
      birthDate: null,
      birthDatePrecision: null,
      deathDate: null,
      deathDatePrecision: null,
      birthCountry: null,
      birthCity: null,
      gender: null,
      baptized: null,
      notes: null,
      isSubject: false,
    };
    const candidates = [...people, unknown];
    expect(parentCandidatesForRole(candidates, "mother").map((person) => person.id)).toEqual(["child", "mother", "unknown"]);
    expect(parentCandidatesForRole(candidates, "father").map((person) => person.id)).toEqual(["father", "unknown"]);
  });

  it("keeps the currently selected parent even if gender does not match the role", () => {
    expect(parentCandidatesForRole(people, "mother", "father").map((person) => person.id)).toContain("father");
  });
});

describe("assertParentRoleGenders", () => {
  it("rejects a male mother or a female father", () => {
    expect(() => assertParentRoleGenders(people, "father", null)).toThrow(/madre/i);
    expect(() => assertParentRoleGenders(people, null, "mother")).toThrow(/padre/i);
  });

  it("accepts matching parent genders", () => {
    expect(() => assertParentRoleGenders(people, "mother", "father")).not.toThrow();
  });
});
