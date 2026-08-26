import type { FamilyPerson, FamilyRelationship } from "./family-graph";

export type GedcomPerson = Omit<FamilyPerson, "id" | "userId" | "isSubject"> & { gedcomId: string };

export type GedcomRelationship = {
  sourceGedcomId: string;
  targetGedcomId: string;
  relationshipType: "parent" | "partner";
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
        people.set(id, { gedcomId: id, fullName: "", birthDate: null, birthDatePrecision: null, deathDate: null, deathDatePrecision: null, birthCountry: null, birthCity: null });
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
    if (family.husband && family.wife && validIds.has(family.husband) && validIds.has(family.wife)) relationships.push({ sourceGedcomId: family.husband, targetGedcomId: family.wife, relationshipType: "partner" });
    for (const child of family.children) {
      if (!validIds.has(child)) continue;
      for (const parent of [family.husband, family.wife]) if (parent && validIds.has(parent)) relationships.push({ sourceGedcomId: parent, targetGedcomId: child, relationshipType: "parent" });
    }
  }
  return { people: validPeople, relationships };
}

export function toGedcom(people: FamilyPerson[], relationships: FamilyRelationship[]) {
  const lines = ["0 HEAD", "1 SOUR YOUR-LIFE-STORY", "1 GEDC", "2 VERS 5.5.1"];
  for (const person of people) {
    lines.push(`0 @${person.id}@ INDI`, `1 NAME ${person.fullName}`);
    if (person.birthDate) lines.push("1 BIRT", `2 DATE ${formatGedcomDate(person.birthDate, person.birthDatePrecision)}`, ...(person.birthCity ? [`2 PLAC ${person.birthCity}${person.birthCountry ? `, ${person.birthCountry}` : ""}`] : []));
    if (person.deathDate) lines.push("1 DEAT", `2 DATE ${formatGedcomDate(person.deathDate, person.deathDatePrecision)}`);
  }
  for (const relationship of relationships.filter((item) => item.relationshipType === "partner")) lines.push(`0 @F${relationship.id}@ FAM`, `1 HUSB @${relationship.sourcePersonId}@`, `1 WIFE @${relationship.targetPersonId}@`);
  for (const relationship of relationships.filter((item) => item.relationshipType === "parent")) lines.push(`0 @F${relationship.id}@ FAM`, `1 HUSB @${relationship.sourcePersonId}@`, `1 CHIL @${relationship.targetPersonId}@`);
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