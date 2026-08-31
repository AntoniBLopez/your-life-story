import { describe, expect, it } from "vitest";
import { parseEntryReflectionResponse } from "./entry-reflection-prompt";

describe("parseEntryReflectionResponse", () => {
  it("parses all reflection fields from JSON", () => {
    const result = parseEntryReflectionResponse(JSON.stringify({
      difficulty: "Me costó asumir que no tenía el control de todo.",
      learning: "Aprendí que pedir ayuda no me hace más débil.",
      transformation: "Ahora delego más y confío en mi equipo.",
      changeDirection: "mixed",
      lifeAreas: ["work", "identity"],
      momentFlags: ["inflection"],
      tags: ["trabajo", "liderazgo", "equipo"],
    }));
    expect(result.difficulty).toContain("control");
    expect(result.learning).toContain("ayuda");
    expect(result.transformation).toContain("delego");
    expect(result.changeDirection).toBe("mixed");
    expect(result.lifeAreas).toEqual(["work", "identity"]);
    expect(result.momentFlags).toEqual(["inflection"]);
    expect(result.tags).toEqual(["trabajo", "liderazgo", "equipo"]);
  });

  it("allows empty moment flags", () => {
    const result = parseEntryReflectionResponse(JSON.stringify({
      difficulty: "Fue duro.",
      learning: "Aprendí algo.",
      transformation: "",
      changeDirection: "neutral",
      lifeAreas: ["general"],
      momentFlags: [],
      tags: ["vida"],
    }));
    expect(result.momentFlags).toEqual([]);
  });
});
