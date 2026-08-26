/**
 * Seeds Toni's real family tree and life story entry.
 * Usage: node scripts/seed-toni-data.mjs
 */
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
const uri = env.MONGODB_CONNECTION_DEV || env.MONGODB_CONNECTION;
const client = new MongoClient(uri);
await client.connect();
const db = client.db();

const userId = USER_ID;
const now = new Date();

// Clear existing family + entries for this user (not demo seed — real data)
await db.collection("family_relationships").deleteMany({ userId });
await db.collection("family_people").deleteMany({ userId });
await db.collection("life_entries").deleteMany({ userId });

const people = [
  { key: "subject", fullName: "Antoni B. López", birthDate: "1997-11-01", birthCity: "Olot", birthCountry: "Catalunya", gender: "male", isSubject: true },
  { key: "father", fullName: "Antoni Bassols Corcoy", birthCountry: "España", gender: "male", isSubject: false },
  { key: "mother", fullName: "Rosario Lopez Lechado", birthCountry: "España", gender: "female", isSubject: false },
  { key: "stepfather", fullName: "Manuel Campos Serrano", birthCountry: "España", gender: "male", isSubject: false },
  { key: "sister", fullName: "Mireya Bassols López", birthDate: "1996-02-21", birthCity: "Olot", birthCountry: "Catalunya", gender: "female", isSubject: false },
  { key: "brother", fullName: "Kevin Campos Lopez", birthDate: "2003-10-01", birthCity: "Girona", birthCountry: "Catalunya", gender: "male", isSubject: false },
];

const personIds = new Map();
for (const person of people) {
  const { key, ...data } = person;
  const record = {
    userId,
    fullName: data.fullName,
    birthDate: data.birthDate ?? null,
    birthDatePrecision: data.birthDate ? "day" : null,
    deathDate: null,
    deathDatePrecision: null,
    birthCountry: data.birthCountry ?? null,
    birthCity: data.birthCity ?? null,
    gender: data.gender ?? null,
    isSubject: data.isSubject,
    createdAt: now,
    updatedAt: now,
  };
  const { insertedId } = await db.collection("family_people").insertOne(record);
  personIds.set(key, insertedId.toString());
}

const relationships = [
  { source: "father", target: "subject", relationshipType: "parent" },
  { source: "mother", target: "subject", relationshipType: "parent" },
  { source: "father", target: "sister", relationshipType: "parent" },
  { source: "mother", target: "sister", relationshipType: "parent" },
  { source: "mother", target: "brother", relationshipType: "parent" },
  { source: "stepfather", target: "brother", relationshipType: "parent" },
];

for (const rel of relationships) {
  await db.collection("family_relationships").insertOne({
    userId,
    sourcePersonId: personIds.get(rel.source),
    targetPersonId: personIds.get(rel.target),
    relationshipType: rel.relationshipType,
    createdAt: now,
  });
}

const narrative = `Calle Bergnes de las Casas, Barcelona (1 diciembre 2024 – 1 febrero 2025).

Vivía en una habitación sin ventana al exterior. Solo tenía una ventana interior, casi pegada al techo, que daba a otra habitación. La lavadora estaba tan deteriorada que, al tender la ropa en mi cuarto, el aire se contaminaba: en veinte segundos me resecaba toda la boca y sentía irritación en la garganta y los pulmones. Mi salud empeoraba y no tenía dinero para irme.

Mi madre me ayudó con unos 300–400 € para completar la fianza de 650 € y los 660 € del primer mes de una nueva habitación: tres o cuatro veces más grande, con balcón y cama de matrimonio, por 320 €/mes. Ese cambio me permitió recuperar la salud y vivir con tranquilidad.

El compañero de la habitación contigua —un hombre de unos 34 años, con ojeras profundas, muy descuidado y sucio— escaló todo cuando reclamé a la dueña la limpieza del piso, algo que ya le había pedido con educación y asertividad en varias ocasiones. Ella se lo comentó y él decidió insultarme en voz alta mientras hablaba por teléfono, subiendo el tono para que lo oyera: me llamaba cobarde, miserable, basura. La ventana entre habitaciones no sellaba; se escuchaba todo como si no hubiera pared.

Era un día duro en eXplorins —el CEO me prohibía usar la IA de Elon Musk por caprichos personales, en un entorno laboral intolerable— y volvía a una habitación seca, contaminada, que me estaba afectando físicamente, con alguien en la habitación de al lado humillándome a propósito.

Al principio aguanté, pensando que se desahogaría. No paró. Salí de la cama, fui a su puerta y le dije con calma que si hablaba de mí era una falta de respeto enorme y que no lo iba a tolerar. Hizo ver que no me había oído. Repetí, más serio. Dijo que no era a mí, bajó la voz un momento y al poco volvió a gritar que era un cobarde de mierda.

Respiré hondo. Recordé que tenía más modales y principios que él. Pero cuando siguió con la ira verbal, salí otra vez y le dije que dejara de insultarme: si tenía algo que hablar, que saliera y lo habláramos. Fui subiendo el tono al ver que solo se calmaba cuando percibía que yo también podía escalar. La situación llegó a un punto muy peligroso: le exigí que saliera o que entraba yo, le abrí la puerta, le miré a la cara y le dejé claro que no iba a tolerar ni un insulto más. Le di golpes fuertes a la puerta como aviso. Le dije todo lo que pensaba de su cobardía de insultar a gritos pero acobardarse en persona. Fue degradante para los dos, pero fue lo que hizo falta para que parara.

Él se fue del piso a la semana siguiente. Dos días después me mudé al nuevo piso que mi madre me ayudó a pagar.`;

const lifeEntry = {
  userId,
  startDate: "2024-12-01",
  endDate: "2025-02-01",
  datePrecision: "day",
  title: "Salir de Bergnes de las Casas: salud, límites y un nuevo hogar",
  narrative,
  lifeArea: "home",
  lifeAreas: ["home", "health", "relationships", "work", "finances"],
  changeDirection: "improved",
  difficulty: "Habitación sin ventilación, contaminación del aire, compañero de piso hostil, falta de dinero y trabajo en una startup con un entorno tóxico.",
  learning: "Pedir ayuda familiar cuando la salud está en juego no es debilidad. Los límites hay que comunicarlos con claridad antes de que la situación se vuelva insostenible.",
  transformation: "Me mudé a un espacio digno, recuperé la salud respiratoria y aprendí a no tolerar el abuso verbal ni los entornos que me erosionan.",
  tags: ["barcelona", "bergnes-de-las-casas", "salud", "hogar", "límites", "familia", "mudanza", "convivencia", "trabajo", "explorins"],
  createdAt: now,
  updatedAt: now,
};

const { insertedId: entryId } = await db.collection("life_entries").insertOne(lifeEntry);

await db.collection("profiles").updateOne(
  { userId },
  { $set: { onboardedAt: now, updatedAt: now } },
);

console.log("✓ Family: 5 people, 6 relationships");
console.log("✓ Life entry:", entryId.toString(), "—", lifeEntry.title);
console.log("✓ Profile marked as onboarded");

await client.close();
