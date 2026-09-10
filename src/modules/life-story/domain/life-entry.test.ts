import { describe, expect, it } from "vitest";
import { assertValidStoryDates, defaultLifeEntryProvenance, entryTone } from "./life-entry";
import { buildLifeEntryFormSnapshot, lifeEntryFormSnapshotsEqual } from "./life-entry-form-state";
import { buildLifeEntryThreads } from "./life-entry-threads";
import type { LifeEntry } from "./life-entry";

describe("life entry dates", () => {
  it("accepts an open-ended or ascending period", () => {
    expect(() => assertValidStoryDates("2022-01-01", null)).not.toThrow();
    expect(() => assertValidStoryDates("2022-01-01", "2022-12-31")).not.toThrow();
  });

  it("rejects a reversed period", () => {
    expect(() => assertValidStoryDates("2022-12-31", "2022-01-01")).toThrow("end date");
  });

  it("gives each direction a distinct visual tone", () => {
    expect(entryTone("improved")).not.toBe(entryTone("difficult"));
  });
});

describe("life entry form snapshot", () => {
  const entry = {
    id: "1",
    userId: "u",
    startDate: "2024-01-02",
    endDate: null,
    datePrecision: "day",
    title: "A title",
    narrative: "What happened",
    lifeArea: "work",
    lifeAreas: ["work", "health"],
    changeDirection: "mixed",
    momentFlags: ["critical"],
    difficulty: null,
    learning: null,
    transformation: null,
    tags: ["salud", "trabajo"],
    ...defaultLifeEntryProvenance({
      title: "A title",
      narrative: "What happened",
      difficulty: null,
      learning: null,
      transformation: null,
    }),
    createdAt: "2024-01-02T00:00:00.000Z",
  } satisfies LifeEntry;

  it("does not treat equivalent saved data as dirty", () => {
    const saved = buildLifeEntryFormSnapshot(entry, null);
    expect(lifeEntryFormSnapshotsEqual(saved, {
      ...saved,
      tags: "Trabajo, salud",
      difficulty: "",
      endDate: "",
      lifeAreas: ["health", "work"],
    })).toBe(true);
  });

  it("treats a change of text origin or AI flag as dirty", () => {
    const saved = buildLifeEntryFormSnapshot(entry, null);
    expect(lifeEntryFormSnapshotsEqual(saved, {
      ...saved,
      textContainsAi: { ...saved.textContainsAi, narrative: true },
    })).toBe(false);
    expect(lifeEntryFormSnapshotsEqual(saved, {
      ...saved,
      textOrigins: { ...saved.textOrigins, title: "spoken" },
    })).toBe(false);
  });
});

describe("life entry threads", () => {
  function entry(overrides: Partial<LifeEntry> & Pick<LifeEntry, "id" | "title" | "startDate">): LifeEntry {
    const merged = {
      userId: "u",
      endDate: null,
      datePrecision: "day" as const,
      narrative: null,
      lifeArea: "work" as const,
      lifeAreas: ["work" as const],
      changeDirection: "mixed" as const,
      momentFlags: [],
      difficulty: null,
      learning: null,
      transformation: null,
      tags: [],
      createdAt: "2024-01-02T00:00:00.000Z",
      ...overrides,
    };
    return {
      ...defaultLifeEntryProvenance(merged),
      ...merged,
    };
  }

  it("groups linked experiences into a single thread", () => {
    const first = entry({ id: "1", title: "Lost a job", startDate: "2024-01-01" });
    const second = entry({ id: "2", title: "Started a company", startDate: "2024-03-01" });
    const third = entry({ id: "3", title: "Unrelated", startDate: "2024-06-01" });
    const threads = buildLifeEntryThreads([first, second, third], [
      { id: "l1", sourceEntryId: "1", targetEntryId: "2", relation: "consequence" },
    ]);
    expect(threads).toHaveLength(1);
    expect(threads[0].entries.map((item) => item.id)).toEqual(["1", "2"]);
  });

  it("ignores links to experiences outside the current set", () => {
    const first = entry({ id: "1", title: "Only visible", startDate: "2024-01-01" });
    const threads = buildLifeEntryThreads([first], [
      { id: "l1", sourceEntryId: "1", targetEntryId: "missing", relation: "related" },
    ]);
    expect(threads).toEqual([]);
  });
});
