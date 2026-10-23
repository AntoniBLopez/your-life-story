import { NextRequest, NextResponse } from "next/server";
import { env, getRequestOrigin } from "@/shared/lib/env";
import { findOrCreateGoogleUser } from "@/modules/identity/application/google-auth-service";
import { exchangeGoogleToken, fetchGoogleProfile } from "@/modules/identity/infrastructure/google-oauth";
import { createSession } from "@/shared/lib/auth/session";
import { getCurrentUser } from "@/shared/lib/auth";
import { touchLastSeen } from "@/modules/identity/infrastructure/mongo-profile-repository";
import { MongoGoogleCalendarAccountRepository } from "@/modules/family-tree/infrastructure/mongo-google-calendar-account-repository";
import { syncAllBirthdayRemindersForUser } from "@/modules/family-tree/application/birthday-reminder-service";
import { PENDING_SIGN_IN_COOKIE } from "@/modules/identity/presentation/last-sign-in-method";

type OAuthState = {
  locale?: string;
  next?: string;
  intent?: string;
  timeZone?: string;
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  let locale: "es" | "en" = "es";
  let next = "/es/app";
  let intent = "login";
  let timeZone = "UTC";

  if (stateParam) {
    try {
      const state = JSON.parse(Buffer.from(stateParam, "base64url").toString()) as OAuthState;
      locale = state.locale === "en" ? "en" : "es";
      next = state.next?.startsWith("/") ? state.next : `/${locale}/app`;
      intent = state.intent === "calendar" ? "calendar" : "login";
      timeZone = state.timeZone || "UTC";
    } catch {
      // Ignore invalid OAuth state.
    }
  }

  if (!code || !env.googleClientId || !env.googleClientSecret) {
    return NextResponse.redirect(new URL(intent === "calendar" ? `/${locale}/app/family?calendar=error` : `/${locale}/login?error=oauth`, request.url));
  }

  try {
    const appUrl = getRequestOrigin(request);
    const tokens = await exchangeGoogleToken(code, appUrl);
    if (intent === "calendar") {
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
      }
      const calendars = new MongoGoogleCalendarAccountRepository();
      const existing = await calendars.findByUser(user.id);
      const refreshToken = tokens.refreshToken ?? existing?.refreshToken;
      if (!refreshToken) {
        return NextResponse.redirect(new URL(`/${locale}/app/family?calendar=error`, request.url));
      }
      const profile = await fetchGoogleProfile(tokens.accessToken);
      await calendars.upsert({
        userId: user.id,
        googleEmail: profile.email,
        refreshToken,
        accessToken: tokens.accessToken,
        accessTokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      });
      await syncAllBirthdayRemindersForUser(user.id, locale, timeZone);
      const destination = next.includes("?") ? `${next}${next.includes("calendar=") ? "" : "&calendar=ok"}` : `${next}?calendar=ok`;
      return NextResponse.redirect(new URL(destination, request.url));
    }

    const profile = await fetchGoogleProfile(tokens.accessToken);
    const user = await findOrCreateGoogleUser({ ...profile, locale });
    await createSession(user.id);
    await touchLastSeen(user.id, { force: true });
    const response = NextResponse.redirect(new URL(next, request.url));
    response.cookies.set(PENDING_SIGN_IN_COOKIE, "google", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch (error) {
    console.error("Google OAuth callback failed:", error);
    return NextResponse.redirect(new URL(intent === "calendar" ? `/${locale}/app/family?calendar=error` : `/${locale}/login?error=oauth`, request.url));
  }
}
