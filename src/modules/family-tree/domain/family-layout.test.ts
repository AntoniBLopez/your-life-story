import { describe, expect, it } from "vitest";
import { relationToSubject, type FamilyPerson, type FamilyRelationship } from "./family-graph";
import { assignPyramidPositions, buildFamilyPositions, computeGenerations, FAMILY_LAYOUT } from "./family-layout";

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

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
  it("centers parents above their children in a pyramid", () => {
    const groups = computeGenerations(blendedFamily, blendedGraph, "subject");
    const xByPerson = assignPyramidPositions(groups, blendedGraph, blendedFamily);
    const fatherX = xByPerson.get("father")!;
    const motherX = xByPerson.get("mother")!;
    const parentsCenter = (fatherX + motherX) / 2;
    const childrenCenter = average(["subject", "sister", "half-brother"].map((id) => xByPerson.get(id)!));
    expect(Math.abs(parentsCenter - childrenCenter)).toBeLessThan(150);
  });

  it("keeps siblings ordered by birth date left to right", () => {
    const groups = computeGenerations(blendedFamily, blendedGraph, "subject");
    const xByPerson = assignPyramidPositions(groups, blendedGraph, blendedFamily);
    expect(xByPerson.get("subject")!).toBeLessThan(xByPerson.get("sister")!);
    expect(xByPerson.get("sister")!).toBeLessThan(xByPerson.get("half-brother")!);
  });

  it("centers the tree horizontally instead of pinning it to the left", () => {
    const { xByPerson } = buildFamilyPositions(blendedFamily, blendedGraph, "subject");
    const xs = [...xByPerson.values()];
    const spread = Math.max(...xs) - Math.min(...xs);
    expect(Math.abs(average(xs))).toBeLessThan(1);
    expect(spread).toBeGreaterThan(200);
  });

  it("stacks generations vertically from ancestors to descendants", () => {
    const { positions } = buildFamilyPositions(blendedFamily, blendedGraph, "subject");
    expect(positions.get("father")!.y).toBeLessThan(positions.get("subject")!.y);
    expect(positions.get("mother")!.y).toBeLessThan(positions.get("subject")!.y);
    expect(positions.get("subject")!.y).toBe(positions.get("sister")!.y);
  });
});

describe("step-parent inference", () => {
  it("labels the other parent of a half-sibling as step-parent without an explicit partner link", () => {
    expect(relationToSubject("stepfather", "subject", blendedGraph, blendedFamily, "es")).toBe("PADRASTRO");
  });
});
