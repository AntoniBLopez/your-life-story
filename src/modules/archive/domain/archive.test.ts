import { describe, expect, it } from "vitest";
import {
  gavePublicPublicationPermission,
  inactivityEffectiveReleaseAt,
  inactivityNoticeAt,
  inactivityReleaseDueAt,
  isArchiveAdmin,
  isPubliclyArchived,
  nextInactivityNoticeStage,
  parseInactivityReleaseYears,
  shouldReleaseForInactivity,
  pickLifeHighlight,
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

  it("only treats a life as publishable after death if they opted in while alive", () => {
    expect(gavePublicPublicationPermission({ publicArchiveConsent: false, inactivityReleaseYears: null })).toBe(false);
    expect(gavePublicPublicationPermission({ publicArchiveConsent: true })).toBe(true);
    expect(gavePublicPublicationPermission({ inactivityReleaseYears: 3 })).toBe(true);
  });

  it("extracts a four-digit year from a date", () => {
    expect(yearFromDate("1952-03-12")).toBe("1952");
    expect(yearFromDate(null)).toBe(null);
  });

  it("prefers a lesson, then a critical moment, as the public highlight", () => {
    expect(pickLifeHighlight([
      { title: "A hard year", learning: "Asking for help changes everything.", transformation: null, difficulty: null, momentFlags: [] },
    ])).toEqual({ highlight: "Asking for help changes everything.", highlightKind: "lesson" });
    expect(pickLifeHighlight([
      { title: "Leaving home", learning: null, transformation: null, difficulty: null, momentFlags: ["turning_point"] },
    ])).toEqual({ highlight: "Leaving home", highlightKind: "moment" });
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
    expect(shouldReleaseForInactivity({
      years: 2,
      lastSeenAt: lastSeen,
      firstNoticeAt: "2025-10-01T00:00:00.000Z",
    }, new Date("2025-12-31T00:00:00.000Z"))).toBe(false);
    expect(shouldReleaseForInactivity({
      years: 2,
      lastSeenAt: lastSeen,
      firstNoticeAt: "2025-10-01T00:00:00.000Z",
    }, new Date("2026-01-01T00:00:00.000Z"))).toBe(true);
  });

  it("does not auto-release someone already marked deceased", () => {
    expect(shouldReleaseForInactivity({
      years: 1,
      lastSeenAt: "2020-01-01T00:00:00.000Z",
      deceasedAt: "2021-01-01T00:00:00.000Z",
      firstNoticeAt: "2020-10-01T00:00:00.000Z",
    })).toBe(false);
  });

  it("does not publish until a three-month notice has had time to land", () => {
    const lastSeen = new Date("2024-01-01T00:00:00.000Z");
    expect(shouldReleaseForInactivity({ years: 1, lastSeenAt: lastSeen }, new Date("2025-01-01T00:00:00.000Z"))).toBe(false);
    expect(shouldReleaseForInactivity({
      years: 1,
      lastSeenAt: lastSeen,
      firstNoticeAt: "2024-12-20T00:00:00.000Z",
    }, new Date("2025-01-01T00:00:00.000Z"))).toBe(false);
    expect(shouldReleaseForInactivity({
      years: 1,
      lastSeenAt: lastSeen,
      firstNoticeAt: "2024-12-20T00:00:00.000Z",
    }, new Date("2025-03-20T00:00:00.000Z"))).toBe(true);
  });
});

describe("inactivity notices", () => {
  const releaseAt = new Date("2026-04-15T00:00:00.000Z");

  it("schedules four warnings before publication", () => {
    expect(inactivityNoticeAt(releaseAt, "months_3").toISOString()).toBe("2026-01-15T00:00:00.000Z");
    expect(inactivityNoticeAt(releaseAt, "months_2").toISOString()).toBe("2026-02-15T00:00:00.000Z");
    expect(inactivityNoticeAt(releaseAt, "months_1").toISOString()).toBe("2026-03-15T00:00:00.000Z");
    expect(inactivityNoticeAt(releaseAt, "weeks_2").toISOString()).toBe("2026-04-01T00:00:00.000Z");
  });

  it("sends the three-month warning first, then the later ones in order", () => {
    expect(nextInactivityNoticeStage({ plannedReleaseAt: releaseAt, now: new Date("2026-01-14T00:00:00.000Z") })).toBe(null);
    expect(nextInactivityNoticeStage({ plannedReleaseAt: releaseAt, now: new Date("2026-01-15T00:00:00.000Z") })).toBe("months_3");
    expect(nextInactivityNoticeStage({
      plannedReleaseAt: releaseAt,
      firstNoticeAt: "2026-01-15T00:00:00.000Z",
      sent: ["months_3"],
      now: new Date("2026-02-15T00:00:00.000Z"),
    })).toBe("months_2");
    expect(nextInactivityNoticeStage({
      plannedReleaseAt: releaseAt,
      firstNoticeAt: "2026-01-15T00:00:00.000Z",
      sent: ["months_3", "months_2"],
      now: new Date("2026-03-15T00:00:00.000Z"),
    })).toBe("months_1");
    expect(nextInactivityNoticeStage({
      plannedReleaseAt: releaseAt,
      firstNoticeAt: "2026-01-15T00:00:00.000Z",
      sent: ["months_3", "months_2", "months_1"],
      now: new Date("2026-04-01T00:00:00.000Z"),
    })).toBe("weeks_2");
    expect(nextInactivityNoticeStage({
      plannedReleaseAt: releaseAt,
      firstNoticeAt: "2026-01-15T00:00:00.000Z",
      sent: ["months_3", "months_2", "months_1", "weeks_2"],
      now: new Date("2026-04-10T00:00:00.000Z"),
    })).toBe(null);
  });

  it("if the first warning is late, delays publication by three months from that email", () => {
    const planned = new Date("2026-01-01T00:00:00.000Z");
    const firstNotice = new Date("2025-12-20T00:00:00.000Z");
    expect(inactivityEffectiveReleaseAt(planned, firstNotice).toISOString()).toBe("2026-03-20T00:00:00.000Z");
    expect(nextInactivityNoticeStage({
      plannedReleaseAt: planned,
      firstNoticeAt: firstNotice,
      sent: ["months_3"],
      now: new Date("2026-01-20T00:00:00.000Z"),
    })).toBe("months_2");
  });

  it("if several later warnings are overdue, still sends them one by one", () => {
    expect(nextInactivityNoticeStage({
      plannedReleaseAt: releaseAt,
      firstNoticeAt: "2026-01-15T00:00:00.000Z",
      sent: ["months_3"],
      now: new Date("2026-04-01T00:00:00.000Z"),
    })).toBe("months_2");
  });
});
