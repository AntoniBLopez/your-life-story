import { describe, expect, it } from "vitest";
import { buildLifeEntryGraph } from "./life-entry-graph";
import type { LifeEntry, LifeEntryLink } from "./life-entry";

const baseEntry = (overrides: Partial<LifeEntry> & Pick<LifeEntry, "id" | "startDate" | "title">): LifeEntry => ({
  userId: "u",
  endDate: null,
  datePrecision: "day",
  narrative: null,
  lifeArea: "general",
  lifeAreas: ["general"],
  changeDirection: "neutral",
  momentFlags: [],
  difficulty: null,
  learning: null,
  transformation: null,
  tags: [],
  createdAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

describe("life entry graph", () => {
  it("positions entries chronologically and keeps consequence chains in columns", () => {
    const entries = [
      baseEntry({ id: "a", startDate: "2020-01-01", title: "Start" }),
      baseEntry({ id: "b", startDate: "2021-06-01", title: "After" }),
      baseEntry({ id: "c", startDate: "2022-03-01", title: "Later" }),
    ];
    const links: LifeEntryLink[] = [
      { id: "l1", sourceEntryId: "a", targetEntryId: "b", relation: "consequence" },
      { id: "l2", sourceEntryId: "b", targetEntryId: "c", relation: "consequence" },
    ];

    const graph = buildLifeEntryGraph(entries, links);
    const nodeA = graph.nodes.find((node) => node.id === "a");
    const nodeB = graph.nodes.find((node) => node.id === "b");
    const nodeC = graph.nodes.find((node) => node.id === "c");

    expect(nodeA && nodeB && nodeC).toBeTruthy();
    expect(nodeA!.y).toBeLessThan(nodeB!.y);
    expect(nodeB!.y).toBeLessThan(nodeC!.y);
    expect(nodeA!.x).toBe(nodeB!.x);
    expect(nodeB!.x).toBe(nodeC!.x);
    expect(graph.edges).toHaveLength(2);
  });

  it("includes related links as edges", () => {
    const entries = [
      baseEntry({ id: "a", startDate: "2020-01-01", title: "One" }),
      baseEntry({ id: "b", startDate: "2020-02-01", title: "Two" }),
    ];
    const links: LifeEntryLink[] = [{ id: "l1", sourceEntryId: "a", targetEntryId: "b", relation: "related" }];
    const graph = buildLifeEntryGraph(entries, links);
    expect(graph.edges[0]?.relation).toBe("related");
  });
});
