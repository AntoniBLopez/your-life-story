import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { env, getRequestOrigin } from "@/shared/lib/env";
import { getCurrentUser } from "@/shared/lib/auth";
import { getGoogleCalendarAuthUrl } from "@/modules/identity/infrastructure/google-oauth";

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "es";
  const nextPath = request.nextUrl.searchParams.get("next") ?? `/${locale}/app/family`;
  const timeZone = request.nextUrl.searchParams.get("timeZone") ?? "UTC";
  if (!env.googleClientId || !env.googleClientSecret) {
    return NextResponse.redirect(new URL(`/${locale}/app/family?calendar=error`, request.url));
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  const state = Buffer.from(JSON.stringify({
    locale,
    next: nextPath.startsWith("/") ? nextPath : `/${locale}/app/family`,
    intent: "calendar",
    timeZone,
    nonce: randomBytes(16).toString("hex"),
  })).toString("base64url");

  return NextResponse.redirect(getGoogleCalendarAuthUrl(state, getRequestOrigin(request)));
}
