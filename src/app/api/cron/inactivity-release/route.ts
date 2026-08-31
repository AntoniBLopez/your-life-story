import { NextRequest } from "next/server";
import { releaseDueInactivityArchives } from "@/modules/archive/infrastructure/mongo-archive-repository";
import { isMongoConfigured } from "@/shared/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isMongoConfigured()) return Response.json({ released: 0 });
  const released = await releaseDueInactivityArchives();
  return Response.json({ released: released.length });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
