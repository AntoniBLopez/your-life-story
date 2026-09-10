import { describe, expect, it } from "vitest";
import {
  defaultTextOriginsFromContent,
  mergeHumanOrigin,
  nextProvenanceAfterAiReplace,
  nextProvenanceAfterSpoken,
  nextProvenanceAfterTyped,
  resolveTextContainsAi,
  resolveTextOrigins,
  textOriginBadgeLabel,
} from "./life-entry-text-origin";

describe("text origin defaults", () => {
  it("treats existing prose as written when a document has no stored origin", () => {
    expect(defaultTextOriginsFromContent({
      title: "A title",
      narrative: "What happened",
      difficulty: " ",
      learning: null,
      transformation: undefined,
    })).toEqual({
      title: "written",
      narrative: "written",
      difficulty: null,
      learning: null,
      transformation: null,
    });
  });

  it("fills missing stored origins from content and ignores invalid values", () => {
    expect(resolveTextOrigins({ title: "spoken", narrative: "robot" }, {
      title: "A title",
      narrative: "What happened",
      difficulty: "Hard",
      learning: null,
      transformation: null,
    })).toEqual({
      title: "spoken",
      narrative: "written",
      difficulty: "written",
      learning: null,
      transformation: null,
    });
  });

  it("only treats explicit true as AI", () => {
    expect(resolveTextContainsAi({ title: true, narrative: "yes", difficulty: false })).toEqual({
      title: true,
      narrative: false,
      difficulty: false,
      learning: false,
      transformation: false,
    });
  });
});

describe("text origin transitions", () => {
  it("merges written and spoken into mixed, without involving AI", () => {
    expect(mergeHumanOrigin(null, "written")).toBe("written");
    expect(mergeHumanOrigin("written", "spoken")).toBe("mixed");
    expect(mergeHumanOrigin("spoken", "written")).toBe("mixed");
    expect(mergeHumanOrigin("mixed", "spoken")).toBe("mixed");
  });

  it("keeps AI when the person types or speaks without clearing the field", () => {
    expect(nextProvenanceAfterTyped(null, true, "my edit")).toEqual({ origin: "written", containsAi: true });
    expect(nextProvenanceAfterSpoken("written", true, "said aloud")).toEqual({ origin: "mixed", containsAi: true });
  });

  it("resets both axes when the field is cleared", () => {
    expect(nextProvenanceAfterTyped("mixed", true, "  ")).toEqual({ origin: null, containsAi: false });
    expect(nextProvenanceAfterSpoken("spoken", false, "")).toEqual({ origin: null, containsAi: false });
  });

  it("marks a replaced field as AI only", () => {
    expect(nextProvenanceAfterAiReplace("generated prose")).toEqual({ origin: null, containsAi: true });
    expect(nextProvenanceAfterAiReplace("")).toEqual({ origin: null, containsAi: false });
  });
});

describe("text origin badges", () => {
  it("covers person-only, AI-only and combined labels", () => {
    expect(textOriginBadgeLabel("written", false, "es")).toBe("Escrito");
    expect(textOriginBadgeLabel("spoken", false, "es")).toBe("Hablado");
    expect(textOriginBadgeLabel("mixed", false, "es")).toBe("Mixto (escrito y hablado)");
    expect(textOriginBadgeLabel(null, true, "es")).toBe("Generado con IA");
    expect(textOriginBadgeLabel("written", true, "es")).toBe("Escrito y generado");
    expect(textOriginBadgeLabel("spoken", true, "es")).toBe("Hablado y generado");
    expect(textOriginBadgeLabel("mixed", true, "es")).toBe("Mixto y generado");
    expect(textOriginBadgeLabel(null, false, "es")).toBeNull();
  });
});
