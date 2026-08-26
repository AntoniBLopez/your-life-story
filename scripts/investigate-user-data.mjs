/**
 * Investigates where user data lives across MongoDB databases.
 * Usage: node scripts/investigate-user-data.mjs
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { MongoClient, ObjectId } from "mongodb";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const TARGET_EMAIL = "toniblopez1@gmail.com";

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

async function inspectUri(uri, label) {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    console.log(`\n${"=".repeat(60)}`);
    console.log(`DATABASE: ${label} → ${db.databaseName}`);
    console.log("=".repeat(60));

    const collections = ["users", "profiles", "life_entries", "family_people", "family_relationships"];
    for (const name of collections) {
      console.log(`  ${name}: ${await db.collection(name).countDocuments()} docs`);
    }

    const allUsers = await db.collection("users").find({}).project({ email: 1, displayName: 1 }).toArray();
    console.log(`\n  Users (${allUsers.length}):`);
    for (const u of allUsers) {
      const userId = u._id.toString();
      const entries = await db.collection("life_entries").countDocuments({ userId });
      const people = await db.collection("family_people").countDocuments({ userId });
      console.log(`    ${u._id} | ${u.email} | ${entries} entries | ${people} people`);
    }

    const user = await db.collection("users").findOne({ email: TARGET_EMAIL.toLowerCase() });
    if (!user) {
      console.log(`\n  ⚠ ${TARGET_EMAIL} not found`);
      return;
    }

    const userId = user._id.toString();
    const entries = await db.collection("life_entries").find({ userId }).toArray();
    console.log(`\n  Data for ${TARGET_EMAIL} (${userId}):`);
    entries.forEach((e) => console.log(`    entry: "${e.title}"`));
    const people = await db.collection("family_people").find({ userId }).toArray();
    people.forEach((p) => console.log(`    person: ${p.fullName}${p.isSubject ? " [TÚ]" : ""}`));
  } finally {
    await client.close();
  }
}

const env = loadEnv();
console.log("Investigating:", TARGET_EMAIL);
console.log("DEV db:", env.MONGODB_CONNECTION_DEV?.split("/").pop()?.split("?")[0]);
console.log("PROD db:", env.MONGODB_CONNECTION?.split("/").pop()?.split("?")[0]);

for (const { uri, label } of [
  { uri: env.MONGODB_CONNECTION_DEV, label: "DEV (pnpm dev)" },
  { uri: env.MONGODB_CONNECTION, label: "PROD (Vercel)" },
].filter((u) => u.uri)) {
  await inspectUri(uri, label);
}
