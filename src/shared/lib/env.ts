export function getMongoUri() {
  if (process.env.NODE_ENV === "development" && process.env.MONGODB_CONNECTION_DEV) {
    return process.env.MONGODB_CONNECTION_DEV;
  }
  return process.env.MONGODB_CONNECTION;
}

export function isMongoConfigured() {
  return Boolean(getMongoUri());
}

export const env = {
  demoMode: process.env.DEMO_MODE === "true" || (process.env.DEMO_MODE !== "false" && !isMongoConfigured()),
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  mongoUri: getMongoUri(),
  sessionSecret: process.env.SESSION_SECRET,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
};
