import { describe, expect, it } from "vitest";
import {
  DEFAULT_BIRTHDAY_OFFSETS,
  birthdayCelebrationOn,
  canRemindBirthday,
  normalizeOffsets,
  offsetKey,
  offsetLabel,
  reminderCivilDate,
  reminderDateTime,
  reminderEventTitle,
} from "./birthday-reminder";

describe("birthday reminders", () => {
  it("only reminds when the birth date includes a day", () => {
    expect(canRemindBirthday("1997-11-01")).toBe(true);
    expect(canRemindBirthday("1997-11")).toBe(false);
    expect(canRemindBirthday(null)).toBe(false);
  });

  it("shifts same day, days, weeks and months before the birthday", () => {
    expect(reminderCivilDate("1997-11-01", { unit: "days", amount: 0, hour: 9, minute: 0 }, 2026)).toBe("2026-11-01");
    expect(reminderCivilDate("1997-11-01", { unit: "days", amount: 1, hour: 20, minute: 0 }, 2026)).toBe("2026-10-31");
    expect(reminderCivilDate("1997-11-01", { unit: "days", amount: 10, hour: 9, minute: 0 }, 2026)).toBe("2026-10-22");
    expect(reminderCivilDate("1997-11-01", { unit: "weeks", amount: 1, hour: 9, minute: 0 }, 2026)).toBe("2026-10-25");
    expect(reminderCivilDate("1997-11-01", { unit: "months", amount: 1, hour: 9, minute: 0 }, 2026)).toBe("2026-10-01");
    expect(reminderCivilDate("2000-03-31", { unit: "months", amount: 1, hour: 9, minute: 0 }, 2026)).toBe("2026-02-28");
    expect(reminderCivilDate("2000-01-01", { unit: "days", amount: 1, hour: 9, minute: 0 }, 2026)).toBe("2025-12-31");
  });

  it("builds a timed local datetime and a yearly event title", () => {
    expect(reminderDateTime("1997-11-01", { unit: "days", amount: 0, hour: 9, minute: 5 }, 2026)).toBe("2026-11-01T09:05:00");
    expect(reminderEventTitle("María", { unit: "days", amount: 0, hour: 9, minute: 0 }, "es")).toBe("Cumpleaños de María");
    expect(reminderEventTitle("María", { unit: "days", amount: 10, hour: 9, minute: 0 }, "es")).toBe("10 días antes: cumpleaños de María");
    expect(offsetLabel({ unit: "days", amount: 0, hour: 9, minute: 0 }, "es")).toBe("El mismo día a las 09:00");
  });

  it("celebrates the birthday of a living person with the age reached", () => {
    expect(birthdayCelebrationOn({ birthDate: "1997-11-01" }, "2026-11-01")).toEqual({ celebrating: true, age: 29 });
    expect(birthdayCelebrationOn({ birthDate: "1997-11-01" }, "2026-11-02")).toEqual({ celebrating: false, age: null });
    expect(birthdayCelebrationOn({ birthDate: "2004-02-29" }, "2026-02-28")).toEqual({ celebrating: true, age: 22 });
    expect(birthdayCelebrationOn({ birthDate: "2004-02-29" }, "2024-02-29")).toEqual({ celebrating: true, age: 20 });
  });

  it("never celebrates without a known day, or for someone who died", () => {
    expect(birthdayCelebrationOn({ birthDate: "1947-08-29", deathDate: "2010-01-04" }, "2026-08-29").celebrating).toBe(false);
    expect(birthdayCelebrationOn({ birthDate: "1947-08-01", birthDatePrecision: "month" }, "2026-08-01").celebrating).toBe(false);
    expect(birthdayCelebrationOn({ birthDate: "1947-01-01", birthDatePrecision: "year" }, "2026-01-01").celebrating).toBe(false);
    expect(birthdayCelebrationOn({ birthDate: null }, "2026-01-01").celebrating).toBe(false);
  });

  it("keeps unique offsets and the default reusable set", () => {
    expect(DEFAULT_BIRTHDAY_OFFSETS.map(offsetKey)).toEqual(["days:0:9:0", "days:1:20:0"]);
    expect(normalizeOffsets([
      { unit: "days", amount: 0, hour: 9, minute: 0 },
      { unit: "days", amount: 0, hour: 9, minute: 0 },
      { unit: "months", amount: 0, hour: 9, minute: 0 },
    ])).toEqual([{ unit: "days", amount: 0, hour: 9, minute: 0 }]);
  });
});
