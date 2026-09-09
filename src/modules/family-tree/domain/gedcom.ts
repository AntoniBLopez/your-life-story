import { impliedCoParentPairs, inferGender, type FamilyPerson, type FamilyRelationship } from "./family-graph";

export type GedcomPerson = Omit<FamilyPerson, "id" | "userId" | "isSubject"> & { gedcomId: string };

export type GedcomRelationship = {
  sourceGedcomId: string;
  targetGedcomId: string;
  relationshipType: "parent";
};

export type GedcomImport = {
  people: GedcomPerson[];
  relationships: GedcomRelationship[];
};

function parseDate(value: string | undefined) {
  if (!value) return { date: null, precision: null } as const;
  const parts = value.trim().toUpperCase().split(/\s+/);
  const months: Record<string, string> = { JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06", JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12" };
  const year = parts.find((part) => /^\d{4}$/.test(part));
  if (!year) return { date: null, precision: null } as const;
  if (parts.length === 1) return { date: `${year}-01-01`, precision: "year" as const };
  const month = months[parts.find((part) => months[part]) ?? ""];
  if (!month) return { date: `${year}-01-01`, precision: "year" as const };
  const day = parts.find((part) => /^\d{1,2}$/.test(part));
  if (!day) return { date: `${year}-${month}-01`, precision: "month" as const };
  return { date: `${year}-${month}-${day.padStart(2, "0")}`, precision: "day" as const };
}

function parsePlace(value: string | undefined) {
  const parts = value?.split(",").map((part) => part.trim()).filter(Boolean) ?? [];
  return { city: parts[0] ?? null, country: parts.at(-1) ?? null };
}

export function parseGedcom(source: string): GedcomImport {
  const lines = source.replace(/^\uFEFF/, "").split(/\r?\n/);
  const people = new Map<string, GedcomPerson>();
  const families: Array<{ husband?: string; wife?: string; children: string[] }> = [];
  let current: { kind: "INDI" | "FAM"; id: string } | undefined;
  let event: "birth" | "death" | undefined;
  let place: string | undefined;

  for (const line of lines) {
    const match = /^(\d+)\s+(@[^@]+@)\s+([A-Z]+)(?:\s+(.*))?$/.exec(line.trim());
    const detail = /^(\d+)\s+([A-Z]+)(?:\s+(.*))?$/.exec(line.trim());
    if (match) {
      const [, level, id, tag, value] = match;
      if (level === "0" && tag === "INDI") {
        current = { kind: "INDI", id };
        people.set(id, { gedcomId: id, fullName: "", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null, gender: null, baptized: null, notes: null, email: null, canReadTimeline: false });
      } else if (level === "0" && tag === "FAM") {
        current = { kind: "FAM", id };
        families.push({ children: [] });
      } else current = undefined;
      event = undefined;
      place = undefined;
      continue;
    }
    if (!detail || !current) continue;
    const [, level, tag, value] = detail;
    if (current.kind === "INDI") {
      const person = people.get(current.id);
      if (!person) continue;
      if (level === "1" && tag === "NAME") person.fullName = (value ?? "").replace(/\//g, "").replace(/\s+/g, " ").trim();
      if (level === "1" && tag === "NOTE") person.notes = (value ?? "").trim() || person.notes;
      if (level === "1" && tag === "_BAPT") person.baptized = value === "Y" ? true : value === "N" ? false : null;
      if (level === "1" && tag === "EMAIL") person.email = (value ?? "").trim().toLowerCase() || person.email;
      if (level === "1" && tag === "BIRT") event = "birth";
      if (level === "1" && tag === "DEAT") event = "death";
      if (level === "2" && tag === "DATE") {
        const parsed = parseDate(value);
        if (event === "birth") { person.birthDate = parsed.date; person.birthDatePrecision = parsed.precision; }
        if (event === "death") { person.deathDate = parsed.date; person.deathDatePrecision = parsed.precision; }
      }
      if (level === "2" && tag === "PLAC") place = value;
      if (level === "1" && tag !== "BIRT" && tag !== "DEAT") event = undefined;
      if (event === "birth" && place) { const parsed = parsePlace(place); person.birthCity = parsed.city; person.birthCountry = parsed.country; }
    } else {
      const family = families.at(-1);
      if (!family || level !== "1") continue;
      if (tag === "HUSB") family.husband = value;
      if (tag === "WIFE") family.wife = value;
      if (tag === "CHIL" && value) family.children.push(value);
    }
  }

  const validPeople = [...people.values()].filter((person) => person.fullName);
  const validIds = new Set(validPeople.map((person) => person.gedcomId));
  const relationships: GedcomRelationship[] = [];
  for (const family of families) {
    for (const child of family.children) {
      if (!validIds.has(child)) continue;
      for (const parent of [family.husband, family.wife]) {
        if (parent && validIds.has(parent)) {
          relationships.push({ sourceGedcomId: parent, targetGedcomId: child, relationshipType: "parent" });
        }
      }
    }
  }
  return { people: validPeople, relationships };
}

function parentsByChild(relationships: FamilyRelationship[]) {
  const parentsByChild = new Map<string, string[]>();
  for (const relationship of relationships) {
    if (relationship.relationshipType !== "parent") continue;
    parentsByChild.set(relationship.targetPersonId, [...(parentsByChild.get(relationship.targetPersonId) ?? []), relationship.sourcePersonId]);
  }
  return parentsByChild;
}

function spouseRoles(personId: string, otherId: string, peopleById: Map<string, FamilyPerson>) {
  const person = peopleById.get(personId);
  const other = peopleById.get(otherId);
  const personGender = inferGender(person ?? { fullName: "", gender: null });
  const otherGender = inferGender(other ?? { fullName: "", gender: null });
  if (personGender === "male") return { husband: personId, wife: otherId };
  if (otherGender === "male") return { husband: otherId, wife: personId };
  if (personGender === "female") return { husband: otherId, wife: personId };
  return { husband: personId, wife: otherId };
}

export function toGedcom(people: FamilyPerson[], relationships: FamilyRelationship[]) {
  const lines = ["0 HEAD", "1 SOUR YOUR-LIFE-STORY", "1 GEDC", "2 VERS 5.5.1"];
  for (const person of people) {
    lines.push(`0 @${person.id}@ INDI`, `1 NAME ${person.fullName}`);
    if (person.birthDate) lines.push("1 BIRT", `2 DATE ${formatGedcomDate(person.birthDate, person.birthDatePrecision)}`, ...(person.birthCity ? [`2 PLAC ${person.birthCity}${person.birthCountry ? `, ${person.birthCountry}` : ""}`] : []));
    if (person.deathDate) lines.push("1 DEAT", `2 DATE ${formatGedcomDate(person.deathDate, person.deathDatePrecision)}`);
    if (person.notes) lines.push(`1 NOTE ${person.notes}`);
    if (person.email) lines.push(`1 EMAIL ${person.email}`);
    if (person.baptized === true) lines.push("1 _BAPT Y");
    if (person.baptized === false) lines.push("1 _BAPT N");
  }

  const peopleById = new Map(people.map((person) => [person.id, person]));
  const byChild = parentsByChild(relationships);
  const families = new Map<string, { parentIds: string[]; children: string[] }>();

  for (const [childId, parentIds] of byChild) {
    const uniqueParents = [...new Set(parentIds)].sort();
    const key = uniqueParents.join("::");
    const family = families.get(key) ?? { parentIds: uniqueParents, children: [] };
    family.children.push(childId);
    families.set(key, family);
  }

  let familyIndex = 0;
  for (const family of families.values()) {
    const famId = `F${familyIndex += 1}`;
    lines.push(`0 @${famId}@ FAM`);
    if (family.parentIds.length === 2) {
      const { husband, wife } = spouseRoles(family.parentIds[0], family.parentIds[1], peopleById);
      lines.push(`1 HUSB @${husband}@`, `1 WIFE @${wife}@`);
    } else if (family.parentIds.length === 1) {
      const parentId = family.parentIds[0];
      const gender = inferGender(peopleById.get(parentId) ?? { fullName: "", gender: null });
      lines.push(gender === "female" ? `1 WIFE @${parentId}@` : `1 HUSB @${parentId}@`);
    }
    for (const childId of family.children) lines.push(`1 CHIL @${childId}@`);
  }

  for (const pair of impliedCoParentPairs(relationships)) {
    const [left, right] = pair.split("::");
    const key = [left, right].sort().join("::");
    const hasFamily = [...families.keys()].some((familyKey) => {
      const parents = familyKey.split("::");
      return parents.includes(left) && parents.includes(right);
    });
    if (!hasFamily) {
      const famId = `F${familyIndex += 1}`;
      const { husband, wife } = spouseRoles(left, right, peopleById);
      lines.push(`0 @${famId}@ FAM`, `1 HUSB @${husband}@`, `1 WIFE @${wife}@`);
    }
  }

  lines.push("0 TRLR");
  return `${lines.join("\r\n")}\r\n`;
}

function formatGedcomDate(date: string, precision: FamilyPerson["birthDatePrecision"]) {
  const [year, month, day] = date.split("-");
  if (precision === "year") return year;
  const names = ["", "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  if (precision === "month") return `${names[Number(month)]} ${year}`;
  return `${day} ${names[Number(month)]} ${year}`;
}
