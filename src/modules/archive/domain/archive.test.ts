import { describe, expect, it } from "vitest";
import { isArchiveAdmin, isPubliclyArchived, slugifyDisplayName, yearFromDate } from "./archive";

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
