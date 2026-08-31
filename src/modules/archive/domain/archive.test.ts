import { describe, expect, it } from "vitest";
import {
  inactivityReleaseDueAt,
  isArchiveAdmin,
  isPubliclyArchived,
  parseInactivityReleaseYears,
  shouldReleaseForInactivity,
  slugifyDisplayName,
  yearFromDate,
} from "./archive";

describe("archive identity", () => {
  it("recognises only the configured admin email", () => {
    expect(isArchiveAdmin("toniblopez1@gmail.com")).toBe(true);
    expect(isArchiveAdmin("  ToniBLopez1@gmail.com  ")).toBe(true);
    expect(isArchiveAdmin("someone@example.com")).toBe(false);
    expect(isArchiveAdmin(null)).toBe(false);
  });

  it("slugifies names without accents or punctuation", () => {
    expect(slugifyDisplayName("Antoni López")).toBe("antoni-lopez");
    expect(slugifyDisplayName("  María   del Mar  ")).toBe("maria-del-mar");
    expect(slugifyDisplayName("***")).toBe("vida");
  });

  it("treats a profile as public only after publication", () => {
    expect(isPubliclyArchived({ publishedAt: null })).toBe(false);
    expect(isPubliclyArchived({ publishedAt: "2026-01-01T00:00:00.000Z" })).toBe(true);
  });

  it("extracts a four-digit year from a date", () => {
    expect(yearFromDate("1952-03-12")).toBe("1952");
    expect(yearFromDate(null)).toBe(null);
  });
});

describe("inactivity release", () => {
  it("only accepts whole years between 1 and 10", () => {
    expect(parseInactivityReleaseYears(1)).toBe(1);
    expect(parseInactivityReleaseYears(10)).toBe(10);
    expect(parseInactivityReleaseYears("3")).toBe(3);
    expect(parseInactivityReleaseYears(0)).toBe(null);
    expect(parseInactivityReleaseYears(11)).toBe(null);
    expect(parseInactivityReleaseYears(1.5)).toBe(null);
  });

  it("releases only after the chosen silence, not before", () => {
    const lastSeen = new Date("2024-01-01T00:00:00.000Z");
    expect(inactivityReleaseDueAt(lastSeen, 2).toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(shouldReleaseForInactivity({ years: 2, lastSeenAt: lastSeen }, new Date("2025-12-31T00:00:00.000Z"))).toBe(false);
    expect(shouldReleaseForInactivity({ years: 2, lastSeenAt: lastSeen }, new Date("2026-01-01T00:00:00.000Z"))).toBe(true);
  });

  it("does not auto-release someone already marked deceased", () => {
    expect(shouldReleaseForInactivity({
      years: 1,
      lastSeenAt: "2020-01-01T00:00:00.000Z",
      deceasedAt: "2021-01-01T00:00:00.000Z",
    })).toBe(false);
  });
});
