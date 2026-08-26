import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/shared/lib/env";
import { getGoogleAuthUrl } from "@/modules/identity/infrastructure/google-oauth";

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "es";
  if (!env.googleClientId || !env.googleClientSecret) {
    return NextResponse.redirect(new URL(`/${locale}/login?error=oauth`, request.url));
  }

  const state = Buffer.from(JSON.stringify({
    locale,
    next: `/${locale}/app`,
    nonce: randomBytes(16).toString("hex"),
  })).toString("base64url");

  return NextResponse.redirect(getGoogleAuthUrl(state, request.nextUrl.origin));
}
