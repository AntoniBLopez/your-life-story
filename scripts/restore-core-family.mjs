/** Restores Toni's core family names and birth dates without wiping the extended tree. */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const USER_ID = "6a8e5e6f1de98fa3287d3733";

function loadEnv() {
  const content = readFileSync(resolve(ROOT, ".env"), "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const corePeople = [
  { match: (name) => name.includes("Antoni") && name.includes("López"), fullName: "Antoni B. López", birthDate: "1997-11-01", birthCity: "Olot", birthCountry: "Catalunya", gender: "male", baptized: true, isSubject: true },
  { match: (name) => /mire/i.test(name), fullName: "Mireya Bassols López", birthDate: "1996-02-21", birthCity: "Olot", birthCountry: "Catalunya", gender: "female", baptized: true, isSubject: false },
  { match: (name) => /kevin/i.test(name), fullName: "Kevin Campos Lopez", birthDate: "2003-10-01", birthCity: "Palamós", birthCountry: "Catalunya", gender: "male", baptized: false, isSubject: false },
  { match: (name) => /rosario/i.test(name), fullName: "Rosario Lopez Lechado", birthCity: "Loja", birthCountry: "España", gender: "female", baptized: null, isSubject: false },
  { match: (name) => name === "Antoni Bassols" || name === "Antoni Bassols Corcoy", fullName: "Antoni Bassols Corcoy", birthCity: "Olot", birthCountry: "Catalunya", gender: "male", baptized: null, isSubject: false },
  { match: (name) => /manuel/i.test(name), fullName: "Manuel Campos Serrano", birthCountry: "España", gender: "male", baptized: null, isSubject: false },
];

const env = loadEnv();
const client = new MongoClient(env.MONGODB_CONNECTION_DEV || env.MONGODB_CONNECTION);
await client.connect();
const db = client.db();
const now = new Date();

const people = await db.collection("family_people").find({ userId: USER_ID }).toArray();
for (const template of corePeople) {
  const person = people.find((item) => template.match(item.fullName));
  if (!person) {
    console.log(`✗ not found for ${template.fullName}`);
    continue;
  }
  await db.collection("family_people").updateOne(
    { _id: person._id },
    {
      $set: {
        fullName: template.fullName,
        birthDate: template.birthDate ?? person.birthDate ?? null,
        birthDatePrecision: template.birthDate ? "day" : person.birthDatePrecision ?? null,
        birthCity: template.birthCity ?? person.birthCity ?? null,
        birthCountry: template.birthCountry ?? person.birthCountry ?? null,
        gender: template.gender,
        baptized: template.baptized,
        isSubject: template.isSubject,
        updatedAt: now,
      },
    },
  );
  console.log(`✓ ${template.fullName}`);
}

await client.close();
