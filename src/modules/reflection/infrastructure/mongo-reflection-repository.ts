import type { ObjectId } from "mongodb";
import type { ReflectionRepository } from "../application/ports/reflection-repository";
import {
  isReflectionChatId,
  normalizeTitleSource,
  type ReflectionConversation,
  type ReflectionMessage,
  type ReflectionRole,
  type ReflectionTitleSource,
} from "../domain/reflection-conversation";
import { getDb } from "@/shared/lib/mongodb/client";
import { COLLECTIONS } from "@/shared/lib/mongodb/collections";
import { idFromDocument, toObjectId } from "@/shared/lib/mongodb/id";

type ChatThreadDbRecord = {
  _id: ObjectId;
  userId: string;
  title: string;
  titleSource?: ReflectionTitleSource;
  createdAt: Date;
  updatedAt: Date;
};

type ChatMessageDbRecord = {
  _id: ObjectId;
  userId: string;
  threadId: string;
  role: ReflectionRole;
  content: string;
  createdAt: Date;
};

function toConversation(record: ChatThreadDbRecord): ReflectionConversation {
  return {
    id: idFromDocument(record),
    title: record.title,
    titleSource: normalizeTitleSource(record.titleSource),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toMessage(record: ChatMessageDbRecord): ReflectionMessage {
  return {
    id: idFromDocument(record),
    role: record.role,
    content: record.content,
    createdAt: record.createdAt.toISOString(),
  };
}

export class MongoReflectionRepository implements ReflectionRepository {
  private async db() {
    return getDb();
  }

  private objectId(chatId: string) {
    if (!isReflectionChatId(chatId)) return null;
    try {
      return toObjectId(chatId);
    } catch {
      return null;
    }
  }

  async hasAiConsent(userId: string) {
    const db = await this.db();
    const profile = await db.collection(COLLECTIONS.profiles).findOne({ userId });
    return Boolean(profile?.aiConsentAt);
  }

  async listConversations(userId: string, limit: number) {
    const db = await this.db();
    const rows = await db.collection<ChatThreadDbRecord>(COLLECTIONS.chatThreads)
      .find({ userId })
      .sort({ updatedAt: -1, _id: -1 })
      .limit(limit)
      .toArray();
    return rows.map(toConversation);
  }

  async findConversation(userId: string, chatId: string) {
    const _id = this.objectId(chatId);
    if (!_id) return null;
    const db = await this.db();
    const row = await db.collection<ChatThreadDbRecord>(COLLECTIONS.chatThreads).findOne({ _id, userId });
    return row ? toConversation(row) : null;
  }

  async createConversation(userId: string, title: string) {
    const db = await this.db();
    const now = new Date();
    const document = {
      userId,
      title,
      titleSource: "derived" as const,
      createdAt: now,
      updatedAt: now,
    };
    const { insertedId } = await db.collection(COLLECTIONS.chatThreads).insertOne(document);
    return toConversation({ ...document, _id: insertedId });
  }

  async renameConversation(userId: string, chatId: string, title: string) {
    const _id = this.objectId(chatId);
    if (!_id) return null;
    const db = await this.db();
    const updatedAt = new Date();
    const result = await db.collection<ChatThreadDbRecord>(COLLECTIONS.chatThreads).updateOne(
      { _id, userId },
      { $set: { title, titleSource: "user", updatedAt } },
    );
    if (result.matchedCount !== 1) return null;
    const row = await db.collection<ChatThreadDbRecord>(COLLECTIONS.chatThreads).findOne({ _id, userId });
    return row ? toConversation(row) : null;
  }

  async replaceDerivedTitle(userId: string, chatId: string, title: string) {
    const _id = this.objectId(chatId);
    if (!_id) return null;
    const db = await this.db();
    const result = await db.collection(COLLECTIONS.chatThreads).updateOne(
      { _id, userId, titleSource: "derived" },
      { $set: { title, titleSource: "generated", updatedAt: new Date() } },
    );
    return result.matchedCount === 1 ? title : null;
  }

  async deleteConversation(userId: string, chatId: string) {
    const _id = this.objectId(chatId);
    if (!_id) return false;
    const db = await this.db();
    const existing = await db.collection(COLLECTIONS.chatThreads).findOne({ _id, userId });
    if (!existing) return false;
    await db.collection(COLLECTIONS.chatMessages).deleteMany({ userId, threadId: chatId });
    await db.collection(COLLECTIONS.chatThreads).deleteOne({ _id, userId });
    return true;
  }

  async listMessages(userId: string, chatId: string, limit: number) {
    if (!this.objectId(chatId)) return [];
    const db = await this.db();
    const rows = await db.collection<ChatMessageDbRecord>(COLLECTIONS.chatMessages)
      .find({ userId, threadId: chatId })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .toArray();
    return rows.reverse().map(toMessage);
  }

  async appendMessage(userId: string, chatId: string, role: ReflectionRole, content: string) {
    const _id = this.objectId(chatId);
    if (!_id) return false;
    const db = await this.db();
    const owned = await db.collection(COLLECTIONS.chatThreads).findOne({ _id, userId });
    if (!owned) return false;
    const now = new Date();
    await db.collection(COLLECTIONS.chatMessages).insertOne({
      userId,
      threadId: chatId,
      role,
      content,
      createdAt: now,
    });
    await db.collection(COLLECTIONS.chatThreads).updateOne({ _id, userId }, { $set: { updatedAt: now } });
    return true;
  }
}
