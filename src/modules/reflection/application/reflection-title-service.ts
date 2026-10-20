import { isAiConfigured, completeChatJson } from "@/shared/lib/ai-providers";
import { parseGeneratedReflectionTitle } from "../domain/reflection-title";

export async function suggestReflectionTitle(input: {
  locale: "es" | "en";
  userMessage: string;
  assistantExcerpt: string;
}) {
  if (!isAiConfigured()) return null;
  const system = input.locale === "es"
    ? "Genera un título breve (máximo 6 palabras) para esta conversación de reflexión personal. Responde solo JSON con la forma {\"title\":\"...\"}. Sin comillas extra ni punto final. Usa el idioma del usuario."
    : "Write a short title (maximum 6 words) for this personal reflection conversation. Reply with JSON only: {\"title\":\"...\"}. No extra quotes and no trailing period. Use the user's language.";
  const user = `USER: ${input.userMessage.slice(0, 500)}\nASSISTANT: ${input.assistantExcerpt.slice(0, 500)}`;
  try {
    const raw = await completeChatJson(system, user);
    return parseGeneratedReflectionTitle(raw);
  } catch (error) {
    console.warn("[reflect] title generation failed:", error instanceof Error ? error.message : error);
    return null;
  }
}
