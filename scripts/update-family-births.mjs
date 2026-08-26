/** Updates birth dates/cities without touching life entries. */
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

const updates = [
  { fullName: "Antoni B. López", birthDate: "1997-11-01", birthCity: "Olot", birthCountry: "Catalunya" },
  { fullName: "Mireya Bassols López", birthDate: "1996-02-21", birthCity: "Olot", birthCountry: "Catalunya" },
  { fullName: "Kevin Campos Lopez", birthDate: "2003-10-01", birthCity: "Girona", birthCountry: "Catalunya" },
];

const env = loadEnv();
const client = new MongoClient(env.MONGODB_CONNECTION_DEV || env.MONGODB_CONNECTION);
await client.connect();
const db = client.db();
const now = new Date();

for (const person of updates) {
  const result = await db.collection("family_people").updateOne(
    { userId: USER_ID, fullName: person.fullName },
    {
      $set: {
        birthDate: person.birthDate,
        birthDatePrecision: "day",
        birthCity: person.birthCity,
        birthCountry: person.birthCountry,
        updatedAt: now,
      },
    },
  );
  console.log(result.matchedCount ? `✓ ${person.fullName}` : `✗ ${person.fullName} not found`);
}

await client.close();
