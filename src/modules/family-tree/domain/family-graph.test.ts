import { describe, expect, it } from "vitest";
import { assertNoParentCycle, relationToSubject, type FamilyPerson, type FamilyRelationship } from "./family-graph";

const people: FamilyPerson[] = [
  { id: "grandparent", userId: "u", fullName: "Luis García", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "male", isSubject: false },
  { id: "parent", userId: "u", fullName: "María García", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "female", isSubject: false },
  { id: "subject", userId: "u", fullName: "Toni López", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "male", isSubject: true },
  { id: "sister", userId: "u", fullName: "Mireya Bassols", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "female", isSubject: false },
  { id: "half-brother", userId: "u", fullName: "Kevin Campos", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "male", isSubject: false },
  { id: "mother", userId: "u", fullName: "Rosario Lopez", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "female", isSubject: false },
  { id: "father", userId: "u", fullName: "Antoni Bassols", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "male", isSubject: false },
  { id: "stepfather", userId: "u", fullName: "Manuel Campos", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "male", isSubject: false },
];

const graph: FamilyRelationship[] = [
  { id: "r1", userId: "u", sourcePersonId: "grandparent", targetPersonId: "parent", relationshipType: "parent" },
  { id: "r2", userId: "u", sourcePersonId: "parent", targetPersonId: "subject", relationshipType: "parent" },
  { id: "r3", userId: "u", sourcePersonId: "father", targetPersonId: "subject", relationshipType: "parent" },
  { id: "r4", userId: "u", sourcePersonId: "mother", targetPersonId: "subject", relationshipType: "parent" },
  { id: "r5", userId: "u", sourcePersonId: "father", targetPersonId: "sister", relationshipType: "parent" },
  { id: "r6", userId: "u", sourcePersonId: "mother", targetPersonId: "sister", relationshipType: "parent" },
  { id: "r7", userId: "u", sourcePersonId: "mother", targetPersonId: "half-brother", relationshipType: "parent" },
  { id: "r8", userId: "u", sourcePersonId: "stepfather", targetPersonId: "half-brother", relationshipType: "parent" },
];

describe("family graph", () => {
  it("prevents parent-child cycles", () => {
    expect(() => assertNoParentCycle(graph, "subject", "grandparent")).toThrow("ciclo");
    expect(() => assertNoParentCycle(graph, "new-parent", "subject")).not.toThrow();
  });

  it("derives a grandparent label relative to the subject", () => {
    expect(relationToSubject("grandparent", "subject", graph, people, "es")).toBe("ABUELO");
  });

  it("labels full siblings by gender", () => {
    expect(relationToSubject("sister", "subject", graph, people, "es")).toBe("HERMANA");
  });

  it("labels half siblings by gender", () => {
    expect(relationToSubject("half-brother", "subject", graph, people, "es")).toBe("HERMANASTRO");
  });

  it("labels parents by gender", () => {
    expect(relationToSubject("father", "subject", graph, people, "es")).toBe("PADRE");
    expect(relationToSubject("mother", "subject", graph, people, "es")).toBe("MADRE");
  });
});
