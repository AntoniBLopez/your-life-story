import { describe, expect, it } from "vitest";
import { parseEntryDictationResponse } from "./entry-dictation-prompt";

describe("parseEntryDictationResponse", () => {
  it("parses structured fields from JSON", () => {
    const result = parseEntryDictationResponse(JSON.stringify({
      title: "Mi mudanza a Madrid",
      narrative: "Me mudé sola y tuve que empezar de cero.",
      difficulty: "Extrañé a mi familia.",
      learning: "Aprendí a confiar en mí misma.",
      transformation: "Ahora me siento más independiente.",
    }));
    expect(result.title).toContain("Madrid");
    expect(result.narrative).toContain("mudé");
    expect(result.difficulty).toContain("familia");
    expect(result.learning).toContain("confiar");
    expect(result.transformation).toContain("independiente");
  });
});
