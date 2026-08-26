import { describe, expect, it } from "vitest";
import { assertNoParentCycle, relationToSubject, type FamilyRelationship } from "./family-graph";

const graph: FamilyRelationship[] = [
  { id: "r1", userId: "u", sourcePersonId: "grandparent", targetPersonId: "parent", relationshipType: "parent" },
  { id: "r2", userId: "u", sourcePersonId: "parent", targetPersonId: "subject", relationshipType: "parent" },
];

describe("family graph", () => {
  it("prevents parent-child cycles", () => {
    expect(() => assertNoParentCycle(graph, "subject", "grandparent")).toThrow("ciclo");
    expect(() => assertNoParentCycle(graph, "new-parent", "subject")).not.toThrow();
  });

  it("derives a grandparent label relative to the subject", () => {
    expect(relationToSubject("grandparent", "subject", graph, "es")).toBe("Abuelo/a");
  });
});
