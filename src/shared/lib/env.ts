export function getMongoUri() {
  if (process.env.NODE_ENV === "development" && process.env.MONGODB_CONNECTION_DEV) {
    return process.env.MONGODB_CONNECTION_DEV;
  }
  return process.env.MONGODB_CONNECTION;
}

export function isMongoConfigured() {
  return Boolean(getMongoUri());
}

export function getRequestOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) {
    const host = forwardedHost.split(",")[0]?.trim();
    if (host) return `${forwardedProto}://${host}`.replace(/\/$/, "");
  }

  return new URL(request.url).origin.replace(/\/$/, "");
}

export function getAppUrl(requestOrigin?: string): string {
  if (requestOrigin) {
    const origin = requestOrigin.replace(/\/$/, "");
    if (!origin.includes("localhost") && !origin.includes("127.0.0.1")) return origin;
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const pointsToLocalhost = !configured
    || configured.includes("localhost")
    || configured.includes("127.0.0.1");

  if (configured && !pointsToLocalhost) return configured;

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return configured ?? "http://localhost:3000";
}

export const env = {
  demoMode: process.env.DEMO_MODE === "true" || (process.env.DEMO_MODE !== "false" && !isMongoConfigured()),
  get appUrl() {
    return getAppUrl();
  },
  mongoUri: getMongoUri(),
  sessionSecret: process.env.SESSION_SECRET,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
};
