import { z } from "zod";
import { normalizeConversationTitle } from "./reflection-conversation";

const generatedTitleSchema = z.object({
  title: z.string(),
});

export function parseGeneratedReflectionTitle(raw: string) {
  try {
    const parsed = generatedTitleSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    return normalizeConversationTitle(parsed.data.title) || null;
  } catch {
    return null;
  }
}
