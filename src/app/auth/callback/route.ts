import { NextRequest, NextResponse } from "next/server";
import { env } from "@/shared/lib/env";
import { findOrCreateGoogleUser } from "@/modules/identity/application/google-auth-service";
import { exchangeGoogleCode, fetchGoogleProfile } from "@/modules/identity/infrastructure/google-oauth";
import { createSession } from "@/shared/lib/auth/session";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  let locale: "es" | "en" = "es";
  let next = "/es/app";

  if (stateParam) {
    try {
      const state = JSON.parse(Buffer.from(stateParam, "base64url").toString()) as { locale?: string; next?: string };
      locale = state.locale === "en" ? "en" : "es";
      next = state.next?.startsWith("/") ? state.next : `/${locale}/app`;
    } catch {
      // Ignore invalid OAuth state.
    }
  }

  if (!code || !env.googleClientId || !env.googleClientSecret) {
    return NextResponse.redirect(new URL(`/${locale}/login?error=oauth`, request.url));
  }

  try {
    const accessToken = await exchangeGoogleCode(code);
    const profile = await fetchGoogleProfile(accessToken);
    const user = await findOrCreateGoogleUser({ ...profile, locale });
    await createSession(user.id);
    return NextResponse.redirect(new URL(next, request.url));
  } catch {
    return NextResponse.redirect(new URL(`/${locale}/login?error=oauth`, request.url));
  }
}
