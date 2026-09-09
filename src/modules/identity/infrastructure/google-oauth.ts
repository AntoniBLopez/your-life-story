import { env } from "@/shared/lib/env";

const LOGIN_SCOPES = "openid email profile";
const CALENDAR_SCOPES = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email";

export type GoogleTokenResponse = {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope?: string;
};

export function getGoogleRedirectUri(appUrl: string) {
  return `${appUrl.replace(/\/$/, "")}/auth/callback`;
}

export function getGoogleAuthUrl(state: string, appUrl: string) {
  const params = new URLSearchParams({
    client_id: env.googleClientId!,
    redirect_uri: getGoogleRedirectUri(appUrl),
    response_type: "code",
    scope: LOGIN_SCOPES,
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export function getGoogleCalendarAuthUrl(state: string, appUrl: string) {
  const params = new URLSearchParams({
    client_id: env.googleClientId!,
    redirect_uri: getGoogleRedirectUri(appUrl),
    response_type: "code",
    scope: CALENDAR_SCOPES,
    state,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleToken(code: string, appUrl: string): Promise<GoogleTokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId!,
      client_secret: env.googleClientSecret!,
      redirect_uri: getGoogleRedirectUri(appUrl),
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) throw new Error("Google token exchange failed.");
  const data = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string };
  if (!data.access_token) throw new Error("Google token exchange failed.");
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in ?? 3600,
    scope: data.scope,
  };
}

export async function exchangeGoogleCode(code: string, appUrl: string) {
  const tokens = await exchangeGoogleToken(code, appUrl);
  return tokens.accessToken;
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env.googleClientId!,
      client_secret: env.googleClientSecret!,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error("Google token refresh failed.");
  const data = await response.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Google token refresh failed.");
  return { accessToken: data.access_token, expiresIn: data.expires_in ?? 3600 };
}

export async function revokeGoogleToken(token: string) {
  await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  }).catch(() => undefined);
}

export async function fetchGoogleProfile(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error("Failed to fetch Google profile.");
  const data = await response.json() as { id: string; email: string; name?: string };
  return { googleId: data.id, email: data.email, displayName: data.name ?? null };
}
