/** Adds Manuel, fixes Kevin's parent links, sets gender on family members. */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { MongoClient, ObjectId } from "mongodb";

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

const env = loadEnv();
const client = new MongoClient(env.MONGODB_CONNECTION_DEV || env.MONGODB_CONNECTION);
await client.connect();
const db = client.db();
const now = new Date();

const byName = async (name) => {
  const doc = await db.collection("family_people").findOne({ userId: USER_ID, fullName: name });
  return doc ? { id: doc._id.toString(), ...doc } : null;
};

const genderUpdates = [
  ["Antoni B. López", "male"],
  ["Antoni Bassols Corcoy", "male"],
  ["Rosario Lopez Lechado", "female"],
  ["Mireya Bassols López", "female"],
  ["Kevin Campos Lopez", "male"],
];

for (const [name, gender] of genderUpdates) {
  await db.collection("family_people").updateOne(
    { userId: USER_ID, fullName: name },
    { $set: { gender, updatedAt: now } },
  );
}

let manuel = await byName("Manuel Campos Serrano");
if (!manuel) {
  const { insertedId } = await db.collection("family_people").insertOne({
    userId: USER_ID,
    fullName: "Manuel Campos Serrano",
    birthDate: null,
    birthDatePrecision: null,
    deathDate: null,
    deathDatePrecision: null,
    birthCountry: "España",
    birthCity: null,
    gender: "male",
    isSubject: false,
    createdAt: now,
    updatedAt: now,
  });
  manuel = { id: insertedId.toString() };
  console.log("✓ Added Manuel Campos Serrano");
}

const kevin = await byName("Kevin Campos Lopez");
const father = await byName("Antoni Bassols Corcoy");
const mother = await byName("Rosario Lopez Lechado");

if (kevin && father) {
  const removed = await db.collection("family_relationships").deleteMany({
    userId: USER_ID,
    sourcePersonId: father.id,
    targetPersonId: kevin.id,
    relationshipType: "parent",
  });
  if (removed.deletedCount) console.log("✓ Removed Antoni → Kevin parent link");
}

if (kevin && manuel) {
  const exists = await db.collection("family_relationships").findOne({
    userId: USER_ID,
    sourcePersonId: manuel.id,
    targetPersonId: kevin.id,
    relationshipType: "parent",
  });
  if (!exists) {
    await db.collection("family_relationships").insertOne({
      userId: USER_ID,
      sourcePersonId: manuel.id,
      targetPersonId: kevin.id,
      relationshipType: "parent",
      createdAt: now,
    });
    console.log("✓ Added Manuel → Kevin parent link");
  }
}

if (kevin && mother) {
  const exists = await db.collection("family_relationships").findOne({
    userId: USER_ID,
    sourcePersonId: mother.id,
    targetPersonId: kevin.id,
    relationshipType: "parent",
  });
  if (!exists) {
    await db.collection("family_relationships").insertOne({
      userId: USER_ID,
      sourcePersonId: mother.id,
      targetPersonId: kevin.id,
      relationshipType: "parent",
      createdAt: now,
    });
    console.log("✓ Added Rosario → Kevin parent link");
  }
}

console.log("✓ Gender fields updated");
await client.close();
