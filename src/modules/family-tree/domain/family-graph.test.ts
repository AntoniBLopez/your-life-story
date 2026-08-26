import { describe, expect, it } from "vitest";
import { assertNoParentCycle, relationToSubject, type FamilyPerson, type FamilyRelationship } from "./family-graph";

const people: FamilyPerson[] = [
  { id: "great-grandparent", userId: "u", fullName: "Luis García", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "male", baptized: null, notes: null, isSubject: false },
  { id: "grandparent", userId: "u", fullName: "Carmen García", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "female", baptized: null, notes: null, isSubject: false },
  { id: "granduncle", userId: "u", fullName: "Pedro García", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "male", baptized: null, notes: null, isSubject: false },
  { id: "parent", userId: "u", fullName: "María García", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "female", baptized: null, notes: null, isSubject: false },
  { id: "uncle", userId: "u", fullName: "Jordi García", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "male", baptized: null, notes: null, isSubject: false },
  { id: "cousin", userId: "u", fullName: "Clara García", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "female", baptized: null, notes: null, isSubject: false },
  { id: "subject", userId: "u", fullName: "Toni López", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "male", baptized: null, notes: null, isSubject: true },
  { id: "sister", userId: "u", fullName: "Mireya Bassols", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "female", baptized: null, notes: null, isSubject: false },
  { id: "nephew", userId: "u", fullName: "Marc Bassols", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "male", baptized: null, notes: null, isSubject: false },
  { id: "half-brother", userId: "u", fullName: "Kevin Campos", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "male", baptized: null, notes: null, isSubject: false },
  { id: "mother", userId: "u", fullName: "Rosario Lopez", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "female", baptized: null, notes: null, isSubject: false },
  { id: "father", userId: "u", fullName: "Antoni Bassols", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "male", baptized: null, notes: null, isSubject: false },
  { id: "stepfather", userId: "u", fullName: "Manuel Campos", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "male", baptized: null, notes: null, isSubject: false },
  { id: "child", userId: "u", fullName: "Laura López", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "female", baptized: null, notes: null, isSubject: false },
  { id: "grandchild", userId: "u", fullName: "Pablo López", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "male", baptized: null, notes: null, isSubject: false },
  { id: "partner", userId: "u", fullName: "Elena Ruiz", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "female", baptized: null, notes: null, isSubject: false },
  { id: "mother-in-law", userId: "u", fullName: "Isabel Ruiz", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "female", baptized: null, notes: null, isSubject: false },
];

const graph: FamilyRelationship[] = [
  { id: "r0", userId: "u", sourcePersonId: "great-grandparent", targetPersonId: "grandparent", relationshipType: "parent" },
  { id: "r0b", userId: "u", sourcePersonId: "great-grandparent", targetPersonId: "granduncle", relationshipType: "parent" },
  { id: "r1", userId: "u", sourcePersonId: "grandparent", targetPersonId: "parent", relationshipType: "parent" },
  { id: "r1b", userId: "u", sourcePersonId: "grandparent", targetPersonId: "uncle", relationshipType: "parent" },
  { id: "r1c", userId: "u", sourcePersonId: "uncle", targetPersonId: "cousin", relationshipType: "parent" },
  { id: "r2", userId: "u", sourcePersonId: "parent", targetPersonId: "subject", relationshipType: "parent" },
  { id: "r3", userId: "u", sourcePersonId: "father", targetPersonId: "subject", relationshipType: "parent" },
  { id: "r4", userId: "u", sourcePersonId: "mother", targetPersonId: "subject", relationshipType: "parent" },
  { id: "r5", userId: "u", sourcePersonId: "father", targetPersonId: "sister", relationshipType: "parent" },
  { id: "r6", userId: "u", sourcePersonId: "mother", targetPersonId: "sister", relationshipType: "parent" },
  { id: "r7", userId: "u", sourcePersonId: "mother", targetPersonId: "half-brother", relationshipType: "parent" },
  { id: "r8", userId: "u", sourcePersonId: "stepfather", targetPersonId: "half-brother", relationshipType: "parent" },
  { id: "r9", userId: "u", sourcePersonId: "mother", targetPersonId: "stepfather", relationshipType: "partner" },
  { id: "r10", userId: "u", sourcePersonId: "subject", targetPersonId: "child", relationshipType: "parent" },
  { id: "r11", userId: "u", sourcePersonId: "child", targetPersonId: "grandchild", relationshipType: "parent" },
  { id: "r12", userId: "u", sourcePersonId: "sister", targetPersonId: "nephew", relationshipType: "parent" },
  { id: "r13", userId: "u", sourcePersonId: "subject", targetPersonId: "partner", relationshipType: "partner" },
  { id: "r14", userId: "u", sourcePersonId: "mother-in-law", targetPersonId: "partner", relationshipType: "parent" },
];

describe("family graph", () => {
  it("prevents parent-child cycles", () => {
    expect(() => assertNoParentCycle(graph, "subject", "great-grandparent")).toThrow("ciclo");
    expect(() => assertNoParentCycle(graph, "new-parent", "subject")).not.toThrow();
  });

  it("derives close blood relations", () => {
    expect(relationToSubject("grandparent", "subject", graph, people, "es")).toBe("ABUELA");
    expect(relationToSubject("father", "subject", graph, people, "es")).toBe("PADRE");
    expect(relationToSubject("mother", "subject", graph, people, "es")).toBe("MADRE");
    expect(relationToSubject("sister", "subject", graph, people, "es")).toBe("HERMANA");
    expect(relationToSubject("half-brother", "subject", graph, people, "es")).toBe("HERMANASTRO");
    expect(relationToSubject("child", "subject", graph, people, "es")).toBe("HIJA");
  });

  it("derives extended blood relations", () => {
    expect(relationToSubject("great-grandparent", "subject", graph, people, "es")).toBe("BISABUELO");
    expect(relationToSubject("uncle", "subject", graph, people, "es")).toBe("TÍO");
    expect(relationToSubject("granduncle", "subject", graph, people, "es")).toBe("TÍO ABUELO");
    expect(relationToSubject("cousin", "subject", graph, people, "es")).toBe("PRIMA");
    expect(relationToSubject("nephew", "subject", graph, people, "es")).toBe("SOBRINO");
    expect(relationToSubject("grandchild", "subject", graph, people, "es")).toBe("NIETO");
  });

  it("derives partner and in-law relations", () => {
    expect(relationToSubject("partner", "subject", graph, people, "es")).toBe("PAREJA");
    expect(relationToSubject("stepfather", "subject", graph, people, "es")).toBe("PADRASTRO");
    expect(relationToSubject("mother-in-law", "subject", graph, people, "es")).toBe("SUEGRA");
  });
});
