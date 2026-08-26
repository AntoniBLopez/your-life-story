import { describe, expect, it } from "vitest";
import { assertValidStoryDates, entryTone } from "./life-entry";

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
