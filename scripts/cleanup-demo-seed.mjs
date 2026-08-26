import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const TARGET_USER_ID = "6a8e5e6f1de98fa3287d3733";
const DEMO_TITLES = ["Un cambio de dirección", "Un verano para volver a mí", "Aprender a pedir ayuda"];

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
    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) value = value.slice(1, -1);
    env[key] = value;
  }
  return env;
}

const env = loadEnv();
const uri = env.MONGODB_CONNECTION_DEV || env.MONGODB_CONNECTION;
const client = new MongoClient(uri);
await client.connect();
const db = client.db();
const entries = await db.collection("life_entries").deleteMany({ userId: TARGET_USER_ID, title: { $in: DEMO_TITLES } });
const people = await db.collection("family_people").deleteMany({ userId: TARGET_USER_ID });
const rels = await db.collection("family_relationships").deleteMany({ userId: TARGET_USER_ID });
console.log(`Cleaned demo seed: ${entries.deletedCount} entries, ${people.deletedCount} people, ${rels.deletedCount} relationships`);
await client.close();
