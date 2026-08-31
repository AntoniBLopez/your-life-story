import { describe, expect, it } from "vitest";
import { parseGedcom } from "./gedcom";

describe("parseGedcom", () => {
  it("imports people, dates, places and family relationships", () => {
    const result = parseGedcom("0 @I1@ INDI\n1 NAME Ada /Lovelace/\n1 BIRT\n2 DATE 10 DEC 1815\n2 PLAC London, England\n0 @I2@ INDI\n1 NAME Byron /Lovelace/\n0 @F1@ FAM\n1 HUSB @I2@\n1 WIFE @I1@\n1 CHIL @I3@\n0 @I3@ INDI\n1 NAME Child /Lovelace/");
    expect(result.people[0]).toMatchObject({ fullName: "Ada Lovelace", birthDate: "1815-12-10", birthCity: "London", birthCountry: "England" });
    expect(result.relationships).toEqual([{ sourceGedcomId: "@I2@", targetGedcomId: "@I1@", relationshipType: "partner" }, { sourceGedcomId: "@I2@", targetGedcomId: "@I3@", relationshipType: "parent" }, { sourceGedcomId: "@I1@", targetGedcomId: "@I3@", relationshipType: "parent" }]);
  });

  it("imports EMAIL without granting timeline access", () => {
    const result = parseGedcom("0 @I1@ INDI\n1 NAME Ada /Lovelace/\n1 EMAIL ada@example.com\n1 _SHARE Y");
    expect(result.people[0]).toMatchObject({ fullName: "Ada Lovelace", email: "ada@example.com", canReadTimeline: false });
  });
});