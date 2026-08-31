import { z } from "zod";

export const entryDictationOutputSchema = z.object({
  title: z.string().trim().max(160).optional().or(z.literal("")),
  narrative: z.string().trim().max(4000).optional().or(z.literal("")),
  difficulty: z.string().trim().max(4000).optional().or(z.literal("")),
  learning: z.string().trim().max(4000).optional().or(z.literal("")),
  transformation: z.string().trim().max(4000).optional().or(z.literal("")),
});

export type EntryDictationOutput = z.infer<typeof entryDictationOutputSchema>;

export function entryDictationInstructions(locale: "es" | "en") {
  if (locale === "es") {
    return `Eres un asistente para un diario de vida privado. Recibirás la transcripción literal de alguien hablando sobre una experiencia personal.

Extrae y organiza la información en estos campos JSON:
- "title": un título breve y claro (máx. 160 caracteres)
- "narrative": qué ocurrió, en primera persona
- "difficulty": qué fue difícil, si lo menciona
- "learning": qué aprendió, si lo menciona
- "transformation": qué cambió después, si lo menciona

Reglas:
- Escribe en español, en primera persona
- No inventes hechos que no estén en la transcripción
- Si un campo no aparece en el audio, déjalo como cadena vacía ""
- Responde SOLO con JSON válido`;
  }

  return `You are an assistant for a private life journal. You will receive a literal transcript of someone speaking about a personal experience.

Extract and organize the information into these JSON fields:
- "title": a short clear title (max 160 characters)
- "narrative": what happened, in the first person
- "difficulty": what was hard, if mentioned
- "learning": what they learned, if mentioned
- "transformation": what changed afterwards, if mentioned

Rules:
- Write in English, in the first person
- Do not invent facts not present in the transcript
- If a field is not mentioned in the audio, leave it as an empty string ""
- Reply ONLY with valid JSON`;
}

export function parseEntryDictationResponse(raw: string) {
  const parsed = JSON.parse(raw) as unknown;
  return entryDictationOutputSchema.parse(parsed);
}
