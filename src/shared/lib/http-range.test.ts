import { describe, expect, it } from "vitest";
import { parseByteRange } from "./http-range";

describe("parseByteRange", () => {
  it("parses a closed byte range", () => {
    expect(parseByteRange("bytes=0-499", 1000)).toEqual({ start: 0, end: 499 });
  });

  it("parses an open-ended byte range", () => {
    expect(parseByteRange("bytes=500-", 1000)).toEqual({ start: 500, end: 999 });
  });

  it("parses a suffix byte range", () => {
    expect(parseByteRange("bytes=-200", 1000)).toEqual({ start: 800, end: 999 });
  });

  it("clamps the end to the file size", () => {
    expect(parseByteRange("bytes=900-1500", 1000)).toEqual({ start: 900, end: 999 });
  });

  it("returns null for invalid ranges", () => {
    expect(parseByteRange("bytes=1000-", 1000)).toBeNull();
    expect(parseByteRange("invalid", 1000)).toBeNull();
    expect(parseByteRange("bytes=-", 1000)).toBeNull();
  });
});
