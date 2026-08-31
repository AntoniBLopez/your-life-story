import { z } from "zod";
import { CHANGE_DIRECTIONS, LIFE_AREAS, MOMENT_FLAGS } from "./life-entry";

export const entryReflectionOutputSchema = z.object({
  difficulty: z.string().trim().max(4000),
  learning: z.string().trim().max(4000),
  transformation: z.string().trim().max(4000),
  changeDirection: z.enum(CHANGE_DIRECTIONS),
  lifeAreas: z.array(z.enum(LIFE_AREAS)).min(1).max(5),
  momentFlags: z.array(z.enum(MOMENT_FLAGS)).max(3),
  tags: z.array(z.string().trim().min(1).max(40)).max(12),
});

export type EntryReflectionOutput = z.infer<typeof entryReflectionOutputSchema>;

export function entryReflectionInstructions(locale: "es" | "en") {
  const lifeAreaList = LIFE_AREAS.join(", ");
  const momentList = MOMENT_FLAGS.join(", ");
  const directionList = CHANGE_DIRECTIONS.join(", ");

  if (locale === "es") {
    return `Eres un asistente compasivo para un diario de vida privado. El usuario ha descrito una experiencia personal en "Qué ocurrió".

A partir SOLO del texto que escribió, completa estos campos JSON:
- "difficulty": qué fue difícil — tensiones, emociones, miedos, obstáculos (2-4 frases, primera persona)
- "learning": qué aprendió o qué insight le dejó (2-4 frases, primera persona)
- "transformation": qué cambió después — en su vida, perspectiva o forma de actuar (2-4 frases; "" si no se desprende del relato)
- "changeDirection": cómo lo sintió en conjunto — uno de: ${directionList}
  - improved: en general mejoró o dejó algo positivo
  - difficult: fue duro o doloroso
  - mixed: mezcla de ambos
  - neutral: sin carga emocional clara
- "lifeAreas": áreas de vida implicadas — array con 1-5 valores de: ${lifeAreaList}
- "momentFlags": tipos de momento que apliquen — array (puede estar vacío []) con valores de: ${momentList}
  - critical: crisis o momento muy intenso
  - inflection: punto donde algo empezó a cambiar de rumbo
  - turning_point: giro vital decisivo
  - Solo incluye los que el relato respalde claramente; si ninguno aplica, usa []
- "tags": 2-6 etiquetas cortas en minúsculas (personas, lugares, temas), sin repetir

Reglas:
- Escribe difficulty, learning y transformation en español, primera persona ("me costó...", "aprendí que...")
- No inventes hechos, personas ni detalles que no estén en el relato
- Si el relato es breve, sé prudente; no rellenes con suposiciones
- No des consejos clínicos
- Responde ÚNICAMENTE con JSON válido`;
  }

  return `You are a compassionate assistant for a private life journal. The user has described a personal experience in "What happened".

From ONLY what they wrote, complete these JSON fields:
- "difficulty": what was hard — tensions, emotions, fears, obstacles (2-4 sentences, first person)
- "learning": what they learned or the insight it left (2-4 sentences, first person)
- "transformation": what changed afterwards — in life, perspective or behavior (2-4 sentences; "" if not implied)
- "changeDirection": how it felt overall — one of: ${directionList}
  - improved: generally positive or left something good
  - difficult: hard or painful
  - mixed: both
  - neutral: no clear emotional charge
- "lifeAreas": life areas involved — array with 1-5 values from: ${lifeAreaList}
- "momentFlags": moment types that apply — array (may be empty []) with values from: ${momentList}
  - critical: crisis or very intense moment
  - inflection: point where something started to shift
  - turning_point: decisive life turn
  - Only include those clearly supported by the account; if none apply, use []
- "tags": 2-6 short lowercase tags (people, places, themes), no duplicates

Rules:
- Write difficulty, learning and transformation in English, first person
- Do not invent facts, people or details not in their account
- If brief, stay prudent; do not fill gaps with assumptions
- No clinical advice
- Reply ONLY with valid JSON`;
}

export function buildEntryReflectionInput(title: string, narrative: string) {
  const trimmedTitle = title.trim() || "(untitled)";
  return `TITLE: ${trimmedTitle}\n\nWHAT HAPPENED:\n${narrative.trim()}`;
}

export function parseEntryReflectionResponse(raw: string) {
  const parsed = JSON.parse(raw) as unknown;
  const result = entryReflectionOutputSchema.parse(parsed);
  return {
    ...result,
    tags: Array.from(new Set(result.tags.map((tag) => tag.toLowerCase()))),
    momentFlags: [...new Set(result.momentFlags)],
    lifeAreas: [...new Set(result.lifeAreas)],
  };
}
