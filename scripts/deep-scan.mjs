/**
 * Deep scan: all MongoDB databases on cluster + all life_entries/family data.
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

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
const baseUri = env.MONGODB_CONNECTION || env.MONGODB_CONNECTION_DEV;
if (!baseUri) { console.log("No MongoDB URI"); process.exit(1); }

const client = new MongoClient(baseUri);
await client.connect();

console.log("=== ALL DATABASES ON CLUSTER ===\n");
const admin = client.db().admin();
const { databases } = await admin.listDatabases();

for (const { name, sizeOnDisk } of databases) {
  if (["admin", "local"].includes(name)) continue;
  const db = client.db(name);
  const entries = await db.collection("life_entries").countDocuments().catch(() => 0);
  const people = await db.collection("family_people").countDocuments().catch(() => 0);
  const users = await db.collection("users").countDocuments().catch(() => 0);
  if (entries > 0 || people > 0 || users > 0) {
    console.log(`📦 ${name} (${Math.round(sizeOnDisk / 1024)}KB)`);
    console.log(`   users: ${users}, life_entries: ${entries}, family_people: ${people}`);

    const allEntries = await db.collection("life_entries").find({}).toArray();
    for (const e of allEntries) {
      console.log(`   ENTRY: [${e.userId}] "${e.title}" | ${e.startDate} | ${(e.narrative ?? "").slice(0, 80)}`);
    }
    const allPeople = await db.collection("family_people").find({}).toArray();
    for (const p of allPeople) {
      console.log(`   PERSON: [${p.userId}] ${p.fullName}${p.isSubject ? " [TÚ]" : ""}`);
    }
    const allUsers = await db.collection("users").find({}).toArray();
    for (const u of allUsers) {
      console.log(`   USER: ${u._id} | ${u.email}`);
    }
    console.log();
  }
}

// Also scan localdb explicitly
const localUri = baseUri.replace(/\/[^/?]+(\?|$)/, "/localdb$1");
if (localUri !== baseUri) {
  console.log("=== SCANNING localdb EXPLICITLY ===\n");
  try {
    const localClient = new MongoClient(localUri);
    await localClient.connect();
    const db = localClient.db();
    const cols = await db.listCollections().toArray();
    for (const col of cols) {
      const count = await db.collection(col.name).countDocuments();
      if (count > 0) {
        console.log(`  ${col.name}: ${count}`);
        const docs = await db.collection(col.name).find({}).limit(20).toArray();
        docs.forEach((d) => {
          if (d.title) console.log(`    "${d.title}"`);
          if (d.fullName) console.log(`    ${d.fullName}`);
          if (d.email) console.log(`    ${d.email}`);
        });
      }
    }
    await localClient.close();
  } catch (e) {
    console.log("  localdb error:", e.message);
  }
}

await client.close();
console.log("\nDone.");
