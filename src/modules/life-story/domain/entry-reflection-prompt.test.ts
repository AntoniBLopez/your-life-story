import { describe, expect, it } from "vitest";
import { parseEntryReflectionResponse, reflectionTitleToApply } from "./entry-reflection-prompt";

describe("parseEntryReflectionResponse", () => {
  it("parses all reflection fields from JSON", () => {
    const result = parseEntryReflectionResponse(JSON.stringify({
      title: "Cuando dejé de controlarlo todo",
      difficulty: "Me costó asumir que no tenía el control de todo.",
      learning: "Aprendí que pedir ayuda no me hace más débil.",
      transformation: "Ahora delego más y confío en mi equipo.",
      changeDirection: "mixed",
      lifeAreas: ["work", "identity"],
      momentFlags: ["inflection"],
      tags: ["trabajo", "liderazgo", "equipo"],
    }));
    expect(result.title).toContain("controlarlo");
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
      title: "  Un momento duro y más largo de lo que cabe en el título  ",
      difficulty: "Fue duro.",
      learning: "Aprendí algo.",
      transformation: "",
      changeDirection: "neutral",
      lifeAreas: ["general"],
      momentFlags: [],
      tags: ["vida"],
    }));
    expect(result.momentFlags).toEqual([]);
    expect(result.title.startsWith("Un momento duro")).toBe(true);
  });

  it("defaults a missing title to empty and clamps a very long one", () => {
    const missing = parseEntryReflectionResponse(JSON.stringify({
      difficulty: "Fue duro.",
      learning: "Aprendí algo.",
      transformation: "",
      changeDirection: "neutral",
      lifeAreas: ["general"],
      momentFlags: [],
      tags: ["vida"],
    }));
    expect(missing.title).toBe("");

    const longTitle = "Título ".repeat(40);
    const clamped = parseEntryReflectionResponse(JSON.stringify({
      title: longTitle,
      difficulty: "Fue duro.",
      learning: "Aprendí algo.",
      transformation: "",
      changeDirection: "neutral",
      lifeAreas: ["general"],
      momentFlags: [],
      tags: ["vida"],
    }));
    expect(clamped.title.length).toBeLessThanOrEqual(160);
  });
});

describe("reflectionTitleToApply", () => {
  it("fills a title only when the current one is empty", () => {
    expect(reflectionTitleToApply("", "Mudanza a Madrid")).toBe("Mudanza a Madrid");
    expect(reflectionTitleToApply("   ", "Mudanza a Madrid")).toBe("Mudanza a Madrid");
    expect(reflectionTitleToApply("Mi título", "Otro título")).toBe("");
    expect(reflectionTitleToApply("", "   ")).toBe("");
    expect(reflectionTitleToApply("", null)).toBe("");
  });
});
