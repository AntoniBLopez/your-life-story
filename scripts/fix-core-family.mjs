/** Fixes Toni's core family after a bad seed: names, dates, subject flag, and parent links. */
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

const env = loadEnv();
const client = new MongoClient(env.MONGODB_CONNECTION_DEV || env.MONGODB_CONNECTION);
await client.connect();
const db = client.db();
const now = new Date();
const uid = USER_ID;

const people = await db.collection("family_people").find({ userId: uid }).toArray();
const byName = (fragment) => people.find((person) => person.fullName.includes(fragment));

const father = people.find((person) => person.fullName === "Antoni Bassols");
const wrongChild = people.find((person) => person.fullName === "Antoni Bassols Corcoy");
const mireya = byName("Mireya");
const kevin = byName("Kevin");
const rosario = byName("Rosario");
const manuel = byName("Manuel");

if (!father || !wrongChild || !mireya || !kevin || !rosario || !manuel) {
  console.error("Missing core people", { father: !!father, wrongChild: !!wrongChild, mireya: !!mireya });
  process.exit(1);
}

await db.collection("family_people").updateMany({ userId: uid }, { $set: { isSubject: false } });

await db.collection("family_people").updateOne(
  { _id: wrongChild._id },
  {
    $set: {
      fullName: "Antoni B. López",
      birthDate: "1997-11-01",
      birthDatePrecision: "day",
      birthCity: "Olot",
      birthCountry: "Catalunya",
      gender: "male",
      baptized: true,
      isSubject: true,
      updatedAt: now,
    },
  },
);

await db.collection("family_people").updateOne(
  { _id: father._id },
  {
    $set: {
      fullName: "Antoni Bassols Corcoy",
      birthCity: "Olot",
      birthCountry: "Catalunya",
      gender: "male",
      isSubject: false,
      updatedAt: now,
    },
  },
);

await db.collection("family_people").updateOne(
  { _id: mireya._id },
  {
    $set: {
      fullName: "Mireya Bassols López",
      birthDate: "1996-02-21",
      birthDatePrecision: "day",
      birthCity: "Olot",
      birthCountry: "Catalunya",
      gender: "female",
      baptized: true,
      updatedAt: now,
    },
  },
);

await db.collection("family_people").updateOne(
  { _id: kevin._id },
  {
    $set: {
      fullName: "Kevin Campos Lopez",
      birthDate: "2003-10-01",
      birthDatePrecision: "day",
      birthCity: "Palamós",
      birthCountry: "Catalunya",
      gender: "male",
      baptized: false,
      updatedAt: now,
    },
  },
);

const subjectId = wrongChild._id.toString();
const fatherId = father._id.toString();

await db.collection("family_relationships").deleteMany({
  userId: uid,
  relationshipType: "parent",
  sourcePersonId: fatherId,
  targetPersonId: subjectId,
});

await db.collection("family_relationships").updateOne(
  { userId: uid, relationshipType: "parent", sourcePersonId: rosario._id.toString(), targetPersonId: subjectId },
  { $setOnInsert: { createdAt: now } },
  { upsert: true },
);

const rosarioChildLink = await db.collection("family_relationships").findOne({
  userId: uid,
  relationshipType: "parent",
  sourcePersonId: rosario._id.toString(),
  targetPersonId: subjectId,
});

if (!rosarioChildLink) {
  await db.collection("family_relationships").insertOne({
    userId: uid,
    sourcePersonId: rosario._id.toString(),
    targetPersonId: subjectId,
    relationshipType: "parent",
    createdAt: now,
  });
}

const fatherChildLink = await db.collection("family_relationships").findOne({
  userId: uid,
  relationshipType: "parent",
  sourcePersonId: fatherId,
  targetPersonId: subjectId,
});

if (!fatherChildLink) {
  await db.collection("family_relationships").insertOne({
    userId: uid,
    sourcePersonId: fatherId,
    targetPersonId: subjectId,
    relationshipType: "parent",
    createdAt: now,
  });
}

console.log("✓ Antoni B. López (subject)", subjectId);
console.log("✓ Antoni Bassols Corcoy (father)", fatherId);
console.log("✓ Mireya Bassols López", mireya._id.toString());
console.log("✓ Kevin Campos Lopez", kevin._id.toString());

await client.close();
