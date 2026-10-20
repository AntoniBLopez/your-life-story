export const REFLECTION_TITLE_MAX = 80;
export const REFLECTION_MESSAGE_MAX = 4000;
export const REFLECTION_HISTORY_LIMIT = 12;
export const REFLECTION_TRANSCRIPT_LIMIT = 200;
export const REFLECTION_CONVERSATION_LIMIT = 100;

const CHAT_ID_PATTERN = /^[a-f0-9]{24}$/i;

export type ReflectionRole = "user" | "assistant";

export type ReflectionTitleSource = "derived" | "generated" | "user" | "legacy";

export type ReflectionMessage = {
  id: string;
  role: ReflectionRole;
  content: string;
  createdAt: string;
};

export type ReflectionConversation = {
  id: string;
  title: string;
  titleSource: ReflectionTitleSource;
  createdAt: string;
  updatedAt: string;
};

export function isReflectionChatId(value: string) {
  return CHAT_ID_PATTERN.test(value);
}

export function normalizeTitleSource(value: unknown): ReflectionTitleSource {
  if (value === "derived" || value === "generated" || value === "user") return value;
  return "legacy";
}

export function canAutotitle(source: ReflectionTitleSource) {
  return source === "derived";
}

export function normalizeConversationTitle(title: string) {
  const collapsed = title
    .replace(/[\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["'«»]+|["'«»]+$/g, "")
    .trim();
  if (!collapsed) return "";
  return collapsed.slice(0, REFLECTION_TITLE_MAX);
}

export function deriveConversationTitle(message: string, locale: "es" | "en") {
  const collapsed = message.replace(/\s+/g, " ").trim();
  if (!collapsed) return locale === "es" ? "Nueva reflexión" : "New reflection";
  const max = 48;
  if (collapsed.length <= max) return collapsed;
  const sliced = collapsed.slice(0, max);
  const boundary = sliced.lastIndexOf(" ");
  const trimmed = (boundary > 24 ? sliced.slice(0, boundary) : sliced).trimEnd();
  return `${trimmed}…`;
}

export function reflectionHistoryForPrompt(messages: ReflectionMessage[], limit = REFLECTION_HISTORY_LIMIT) {
  return messages.slice(-Math.max(0, limit));
}

export function formatReflectionHistory(messages: ReflectionMessage[]) {
  if (messages.length === 0) return "(none)";
  return messages.map((item) => `${item.role === "user" ? "USER" : "ASSISTANT"}: ${item.content}`).join("\n");
}
