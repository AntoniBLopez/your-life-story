import { describe, expect, it } from "vitest";
import { parseEntryDictationResponse, resolveDictationDates } from "./entry-dictation-prompt";

describe("parseEntryDictationResponse", () => {
  it("parses structured fields from JSON", () => {
    const result = parseEntryDictationResponse(JSON.stringify({
      title: "Mi mudanza a Madrid",
      narrative: "Me mudé sola y tuve que empezar de cero.",
      difficulty: "Extrañé a mi familia.",
      learning: "Aprendí a confiar en mí misma.",
      transformation: "Ahora me siento más independiente.",
      startDate: "2019-03-01",
      endDate: "",
      datePrecision: "month",
      changeDirection: "mixed",
      lifeAreas: ["home", "identity"],
      momentFlags: ["inflection"],
      tags: ["Madrid", "mudanza"],
    }));
    expect(result.title).toContain("Madrid");
    expect(result.narrative).toContain("mudé");
    expect(result.difficulty).toContain("familia");
    expect(result.learning).toContain("confiar");
    expect(result.transformation).toContain("independiente");
    expect(result.startDate).toBe("2019-03-01");
    expect(result.endDate).toBe("");
    expect(result.datePrecision).toBe("month");
    expect(result.changeDirection).toBe("mixed");
    expect(result.lifeAreas).toEqual(["home", "identity"]);
    expect(result.momentFlags).toEqual(["inflection"]);
    expect(result.tags).toEqual(["madrid", "mudanza"]);
  });

  it("defaults classification fields when omitted", () => {
    const result = parseEntryDictationResponse(JSON.stringify({
      title: "Un día raro",
      narrative: "Pasaron muchas cosas sin que supiera qué hacer.",
    }));
    expect(result.startDate).toBe("");
    expect(result.endDate).toBe("");
    expect(result.datePrecision).toBe("day");
    expect(result.changeDirection).toBe("neutral");
    expect(result.lifeAreas).toEqual(["general"]);
    expect(result.momentFlags).toEqual([]);
    expect(result.tags).toEqual([]);
  });

  it("coerces invalid dates to empty strings", () => {
    const result = parseEntryDictationResponse(JSON.stringify({
      title: "Sin fecha clara",
      narrative: "Fue hace tiempo, no recuerdo cuándo.",
      startDate: "marzo 2020",
      endDate: "n/a",
    }));
    expect(result.startDate).toBe("");
    expect(result.endDate).toBe("");
  });
});

describe("resolveDictationDates", () => {
  it("uses named start date and precision, and keeps end empty when missing", () => {
    expect(resolveDictationDates({
      startDate: "2019-01-01",
      endDate: "",
      datePrecision: "year",
    }, "2026-09-10")).toEqual({
      startDate: "2019-01-01",
      endDate: "",
      datePrecision: "year",
    });
  });

  it("falls back to today and day precision when no start date is named", () => {
    expect(resolveDictationDates({
      startDate: "",
      endDate: "",
      datePrecision: "year",
    }, "2026-09-10")).toEqual({
      startDate: "2026-09-10",
      endDate: "",
      datePrecision: "day",
    });
  });

  it("keeps a named end date only when it is usable and not before start", () => {
    expect(resolveDictationDates({
      startDate: "2020-03-01",
      endDate: "2020-08-15",
      datePrecision: "day",
    }, "2026-09-10")).toEqual({
      startDate: "2020-03-01",
      endDate: "2020-08-15",
      datePrecision: "day",
    });
  });

  it("drops an invalid or earlier end date", () => {
    expect(resolveDictationDates({
      startDate: "2020-03-01",
      endDate: "2019-01-01",
      datePrecision: "month",
    }, "2026-09-10").endDate).toBe("");
  });
});
