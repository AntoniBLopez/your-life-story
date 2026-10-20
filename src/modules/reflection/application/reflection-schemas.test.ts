import { describe, expect, it } from "vitest";
import { reflectionChatRequestSchema, renameReflectionConversationSchema } from "./reflection-schemas";

describe("reflection request schemas", () => {
  it("accepts a new chat message and an owned chat id", () => {
    const chatId = "64b6f0c2a1b2c3d4e5f60718";
    expect(reflectionChatRequestSchema.parse({ message: "  Hola  ", locale: "es" })).toEqual({
      message: "Hola",
      locale: "es",
    });
    expect(reflectionChatRequestSchema.parse({ message: "Hello", locale: "en", chatId }).chatId).toBe(chatId);
  });

  it("rejects another shape of chat id, an empty message, and a long title", () => {
    expect(reflectionChatRequestSchema.safeParse({ message: "Hi", locale: "en", chatId: "not-an-id" }).success).toBe(false);
    expect(reflectionChatRequestSchema.safeParse({ message: "   ", locale: "en" }).success).toBe(false);
    expect(renameReflectionConversationSchema.safeParse({
      chatId: "64b6f0c2a1b2c3d4e5f60718",
      title: "x".repeat(81),
      locale: "es",
    }).success).toBe(false);
  });
});
