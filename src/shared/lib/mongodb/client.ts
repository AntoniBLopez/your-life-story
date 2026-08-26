import { MongoClient, type Db } from "mongodb";
import { getMongoUri } from "../env";
import { COLLECTIONS } from "./collections";

const globalForMongo = globalThis as unknown as { mongoClient?: Promise<MongoClient> };

export async function getMongoClient(): Promise<MongoClient> {
  const uri = getMongoUri();
  if (!uri) throw new Error("MONGODB_CONNECTION is not configured.");

  if (!globalForMongo.mongoClient) {
    const client = new MongoClient(uri);
    globalForMongo.mongoClient = client.connect().then(async (connected) => {
      await ensureIndexes(connected.db());
      return connected;
    });
  }

  return globalForMongo.mongoClient;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db();
}

async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection(COLLECTIONS.users).createIndex({ email: 1 }, { unique: true }),
    db.collection(COLLECTIONS.sessions).createIndex({ token: 1 }, { unique: true }),
    db.collection(COLLECTIONS.sessions).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection(COLLECTIONS.lifeEntries).createIndex({ userId: 1, startDate: 1, createdAt: 1 }),
    db.collection(COLLECTIONS.lifeEntryLinks).createIndex({ userId: 1, sourceEntryId: 1 }),
    db.collection(COLLECTIONS.entryAttachments).createIndex({ userId: 1, entryId: 1 }),
    db.collection(COLLECTIONS.familyPeople).createIndex({ userId: 1, fullName: 1 }),
    db.collection(COLLECTIONS.familyRelationships).createIndex({ userId: 1 }),
    db.collection(COLLECTIONS.chatMessages).createIndex({ userId: 1, threadId: 1, createdAt: 1 }),
    db.collection(COLLECTIONS.passwordResetTokens).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
}
