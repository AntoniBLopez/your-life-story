import type { ObjectId } from "mongodb";
import { getDb } from "@/shared/lib/mongodb/client";
import { COLLECTIONS } from "@/shared/lib/mongodb/collections";
import { decryptSecret, encryptSecret } from "@/shared/lib/secret";

export type GoogleCalendarAccount = {
  userId: string;
  googleEmail: string;
  refreshToken: string;
  accessToken: string | null;
  accessTokenExpiresAt: Date | null;
  calendarId: string;
};

type AccountDbRecord = {
  _id: ObjectId;
  userId: string;
  googleEmail: string;
  refreshToken: string;
  accessToken?: string | null;
  accessTokenExpiresAt?: Date | null;
  calendarId: string;
  createdAt: Date;
  updatedAt: Date;
};

export class MongoGoogleCalendarAccountRepository {
  private async db() {
    return getDb();
  }

  async findByUser(userId: string): Promise<GoogleCalendarAccount | null> {
    const db = await this.db();
    const row = await db.collection<AccountDbRecord>(COLLECTIONS.googleCalendarAccounts).findOne({ userId });
    if (!row) return null;
    return {
      userId: row.userId,
      googleEmail: row.googleEmail,
      refreshToken: decryptSecret(row.refreshToken),
      accessToken: row.accessToken ? decryptSecret(row.accessToken) : null,
      accessTokenExpiresAt: row.accessTokenExpiresAt ?? null,
      calendarId: row.calendarId || "primary",
    };
  }

  async upsert(account: Omit<GoogleCalendarAccount, "calendarId"> & { calendarId?: string }) {
    const db = await this.db();
    const now = new Date();
    await db.collection(COLLECTIONS.googleCalendarAccounts).updateOne(
      { userId: account.userId },
      {
        $set: {
          googleEmail: account.googleEmail,
          refreshToken: encryptSecret(account.refreshToken),
          accessToken: account.accessToken ? encryptSecret(account.accessToken) : null,
          accessTokenExpiresAt: account.accessTokenExpiresAt,
          calendarId: account.calendarId ?? "primary",
          updatedAt: now,
        },
        $setOnInsert: { userId: account.userId, createdAt: now },
      },
      { upsert: true },
    );
  }

  async updateAccessToken(userId: string, accessToken: string, expiresAt: Date) {
    const db = await this.db();
    await db.collection(COLLECTIONS.googleCalendarAccounts).updateOne(
      { userId },
      { $set: { accessToken: encryptSecret(accessToken), accessTokenExpiresAt: expiresAt, updatedAt: new Date() } },
    );
  }

  async deleteByUser(userId: string) {
    const db = await this.db();
    await db.collection(COLLECTIONS.googleCalendarAccounts).deleteOne({ userId });
  }
}
