import { describe, expect, it } from "vitest";
import {
  canAutotitle,
  deriveConversationTitle,
  formatReflectionHistory,
  normalizeConversationTitle,
  normalizeTitleSource,
  reflectionHistoryForPrompt,
  type ReflectionMessage,
} from "./reflection-conversation";
import { buildReflectionPrompt } from "./reflection-prompt";
import { parseGeneratedReflectionTitle } from "./reflection-title";

function message(id: string, role: ReflectionMessage["role"], content: string): ReflectionMessage {
  return { id, role, content, createdAt: "2026-01-01T00:00:00.000Z" };
}

describe("reflection conversations", () => {
  it("keeps legacy threads untitled by the model", () => {
    expect(normalizeTitleSource(undefined)).toBe("legacy");
    expect(normalizeTitleSource("generated")).toBe("generated");
    expect(canAutotitle("derived")).toBe(true);
    expect(canAutotitle("legacy")).toBe(false);
    expect(canAutotitle("user")).toBe(false);
    expect(canAutotitle("generated")).toBe(false);
  });

  it("derives a short title from the first message", () => {
    expect(deriveConversationTitle("  What patterns   do you see?  ", "en")).toBe("What patterns do you see?");
    expect(deriveConversationTitle("", "es")).toBe("Nueva reflexión");
    const title = deriveConversationTitle("Quiero entender por qué cada cambio de ciudad me deja la misma pregunta abierta sobre pertenencia", "es");
    expect(title.endsWith("…")).toBe(true);
    expect(title.length).toBeLessThanOrEqual(49);
  });

  it("normalizes renamed titles", () => {
    expect(normalizeConversationTitle("  «Mudanza»  ")).toBe("Mudanza");
    expect(normalizeConversationTitle("   ")).toBe("");
    expect(normalizeConversationTitle("a".repeat(120)).length).toBe(80);
  });

  it("sends only the active chat history to the model", () => {
    const current = [
      message("1", "user", "first"),
      message("2", "assistant", "reply"),
      message("3", "user", "latest"),
    ];
    const otherChat = [message("x", "user", "secret from another chat")];
    const history = reflectionHistoryForPrompt([...current, ...otherChat].slice(0, 3), 2);
    expect(history.map((item) => item.id)).toEqual(["2", "3"]);
    const prompt = buildReflectionPrompt("HISTORIA", history);
    expect(prompt).toContain("USER: latest");
    expect(prompt).toContain("ASSISTANT: reply");
    expect(prompt).not.toContain("secret from another chat");
    expect(prompt).not.toContain("first");
    expect(formatReflectionHistory([])).toBe("(none)");
  });

  it("parses an AI title and rejects empty ones", () => {
    expect(parseGeneratedReflectionTitle('{"title":"  Cambio de ciudad "}')).toBe("Cambio de ciudad");
    expect(parseGeneratedReflectionTitle('{"title":"   "}')).toBeNull();
    expect(parseGeneratedReflectionTitle("not-json")).toBeNull();
  });
});
