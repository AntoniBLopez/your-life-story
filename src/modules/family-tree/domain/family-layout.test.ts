import { describe, expect, it } from "vitest";
import { relationToSubject, type FamilyPerson, type FamilyRelationship } from "./family-graph";
import { assignHorizontalPositions, buildFamilyPositions, computeGenerations, sortPeopleByBirthDate } from "./family-layout";

const blendedFamily: FamilyPerson[] = [
  { id: "subject", userId: "u", fullName: "Toni López", birthDate: "1995-06-10", birthDatePrecision: "day", deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "male", baptized: null, notes: null, isSubject: true },
  { id: "sister", userId: "u", fullName: "Mireya Bassols", birthDate: "1998-03-21", birthDatePrecision: "day", deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "female", baptized: null, notes: null, isSubject: false },
  { id: "half-brother", userId: "u", fullName: "Kevin Campos", birthDate: "2002-11-04", birthDatePrecision: "day", deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "male", baptized: null, notes: null, isSubject: false },
  { id: "mother", userId: "u", fullName: "Rosario Lopez", birthDate: "1970-02-14", birthDatePrecision: "day", deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "female", baptized: null, notes: null, isSubject: false },
  { id: "father", userId: "u", fullName: "Antoni Bassols", birthDate: "1968-09-03", birthDatePrecision: "day", deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "male", baptized: null, notes: null, isSubject: false },
  { id: "stepfather", userId: "u", fullName: "Manuel Campos", birthDate: "1972-12-01", birthDatePrecision: "day", deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: "male", baptized: null, notes: null, isSubject: false },
];

const blendedGraph: FamilyRelationship[] = [
  { id: "r1", userId: "u", sourcePersonId: "father", targetPersonId: "subject", relationshipType: "parent" },
  { id: "r2", userId: "u", sourcePersonId: "mother", targetPersonId: "subject", relationshipType: "parent" },
  { id: "r3", userId: "u", sourcePersonId: "father", targetPersonId: "sister", relationshipType: "parent" },
  { id: "r4", userId: "u", sourcePersonId: "mother", targetPersonId: "sister", relationshipType: "parent" },
  { id: "r5", userId: "u", sourcePersonId: "mother", targetPersonId: "half-brother", relationshipType: "parent" },
  { id: "r6", userId: "u", sourcePersonId: "stepfather", targetPersonId: "half-brother", relationshipType: "parent" },
];

describe("family layout", () => {
  it("sorts each generation by birth date from left to right", () => {
    const groups = computeGenerations(blendedFamily, blendedGraph, "subject");
    const xByPerson = assignHorizontalPositions(groups);

    expect(xByPerson.get("father")).toBeLessThan(xByPerson.get("mother")!);
    expect(xByPerson.get("mother")).toBeLessThan(xByPerson.get("stepfather")!);
    expect(xByPerson.get("subject")).toBeLessThan(xByPerson.get("sister")!);
    expect(xByPerson.get("sister")).toBeLessThan(xByPerson.get("half-brother")!);
  });

  it("gives every person in a generation a unique horizontal slot", () => {
    const { xByPerson } = buildFamilyPositions(blendedFamily, blendedGraph, "subject");
    const parentGeneration = sortPeopleByBirthDate(blendedFamily.filter((person) => ["father", "mother", "stepfather"].includes(person.id)));
    const xs = parentGeneration.map((person) => xByPerson.get(person.id));
    expect(new Set(xs).size).toBe(parentGeneration.length);
  });
});

describe("step-parent inference", () => {
  it("labels the other parent of a half-sibling as step-parent without an explicit partner link", () => {
    expect(relationToSubject("stepfather", "subject", blendedGraph, blendedFamily, "es")).toBe("PADRASTRO");
  });
});
