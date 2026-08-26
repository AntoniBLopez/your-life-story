import { env, getAppUrl } from "@/shared/lib/env";

export function getGoogleAuthUrl(state: string, appUrl = getAppUrl()) {
  const params = new URLSearchParams({
    client_id: env.googleClientId!,
    redirect_uri: `${appUrl}/auth/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleCode(code: string, appUrl = getAppUrl()) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId!,
      client_secret: env.googleClientSecret!,
      redirect_uri: `${appUrl}/auth/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) throw new Error("Google token exchange failed.");
  const data = await response.json() as { access_token?: string };
  if (!data.access_token) throw new Error("Google token exchange failed.");
  return data.access_token;
}

export async function fetchGoogleProfile(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error("Failed to fetch Google profile.");
  const data = await response.json() as { id: string; email: string; name?: string };
  return { googleId: data.id, email: data.email, displayName: data.name ?? null };
}
