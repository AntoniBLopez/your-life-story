import { z } from "zod";
import {
  CHANGE_DIRECTIONS,
  DATE_PRECISIONS,
  LIFE_AREAS,
  LIFE_ENTRY_TEXT_MAX,
  LIFE_ENTRY_TITLE_MAX,
  MOMENT_FLAGS,
  type DatePrecision,
} from "./life-entry";

const optionalIsoDate = z.string().trim().optional().transform((value) => {
  const next = value ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(next) ? next : "";
});

export const entryDictationOutputSchema = z.object({
  title: z.string().trim().max(LIFE_ENTRY_TITLE_MAX).optional().or(z.literal("")),
  narrative: z.string().trim().max(LIFE_ENTRY_TEXT_MAX).optional().or(z.literal("")),
  difficulty: z.string().trim().max(LIFE_ENTRY_TEXT_MAX).optional().or(z.literal("")),
  learning: z.string().trim().max(LIFE_ENTRY_TEXT_MAX).optional().or(z.literal("")),
  transformation: z.string().trim().max(LIFE_ENTRY_TEXT_MAX).optional().or(z.literal("")),
  startDate: optionalIsoDate,
  endDate: optionalIsoDate,
  datePrecision: z.enum(DATE_PRECISIONS).optional().default("day"),
  changeDirection: z.enum(CHANGE_DIRECTIONS).optional().default("neutral"),
  lifeAreas: z.array(z.enum(LIFE_AREAS)).max(5).optional().default(["general"]),
  momentFlags: z.array(z.enum(MOMENT_FLAGS)).max(3).optional().default([]),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional().default([]),
});

export type EntryDictationOutput = z.infer<typeof entryDictationOutputSchema>;

export function entryDictationInstructions(locale: "es" | "en") {
  const lifeAreaList = LIFE_AREAS.join(", ");
  const momentList = MOMENT_FLAGS.join(", ");
  const directionList = CHANGE_DIRECTIONS.join(", ");
  const precisionList = DATE_PRECISIONS.join(", ");

  if (locale === "es") {
    return `Eres un asistente para un diario de vida privado. Recibirás la transcripción literal de alguien hablando sobre una experiencia personal.

Extrae y organiza la información en estos campos JSON:
- "title": un título breve y claro (máx. 160 caracteres)
- "narrative": qué ocurrió, en primera persona
- "difficulty": qué fue difícil — tensiones, emociones, miedos, obstáculos (2-4 frases, primera persona; "" si no se desprende)
- "learning": qué aprendió o qué insight le dejó (2-4 frases, primera persona; "" si no se desprende)
- "transformation": qué cambió después (2-4 frases; "" si no se desprende)
- "startDate": fecha de inicio en ISO YYYY-MM-DD SOLO si el relato nombra una fecha; si no hay ninguna, ""
  - si dice un año («en 2019») → "2019-01-01"
  - si dice mes y año («marzo de 2020») → "2020-03-01"
  - si dice un día concreto, usa ese día
- "endDate": fecha de fin en ISO YYYY-MM-DD SOLO si nombra un final; si no dice nada de fecha de fin, ""
- "datePrecision": uno de: ${precisionList}
  - year: solo se nombra un año
  - month: se nombra mes (y año)
  - day: se nombra un día concreto
  - si no hay fecha de inicio, usa "day"
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
- Escribe title, narrative, difficulty, learning y transformation en español, primera persona
- No inventes hechos, personas, fechas ni detalles que no estén en la transcripción
- No inventes una fecha de inicio ni de fin: si no se nombra, usa ""
- No copies startDate en endDate
- Si el relato es breve, sé prudente; no rellenes con suposiciones
- No des consejos clínicos
- Responde SOLO con JSON válido`;
  }

  return `You are an assistant for a private life journal. You will receive a literal transcript of someone speaking about a personal experience.

Extract and organize the information into these JSON fields:
- "title": a short clear title (max 160 characters)
- "narrative": what happened, in the first person
- "difficulty": what was hard — tensions, emotions, fears, obstacles (2-4 sentences, first person; "" if not implied)
- "learning": what they learned or the insight it left (2-4 sentences, first person; "" if not implied)
- "transformation": what changed afterwards (2-4 sentences; "" if not implied)
- "startDate": start date as ISO YYYY-MM-DD ONLY if the account names a date; if none, ""
  - if they name a year ("in 2019") → "2019-01-01"
  - if they name a month and year ("March 2020") → "2020-03-01"
  - if they name a specific day, use that day
- "endDate": end date as ISO YYYY-MM-DD ONLY if they name an ending; if they say nothing about an end date, ""
- "datePrecision": one of: ${precisionList}
  - year: only a year is named
  - month: a month (and year) is named
  - day: a specific day is named
  - if there is no start date, use "day"
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
- Write title, narrative, difficulty, learning and transformation in English, first person
- Do not invent facts, people, dates or details not in the transcript
- Do not invent a start or end date: if none is named, use ""
- Do not copy startDate into endDate
- If brief, stay prudent; do not fill gaps with assumptions
- No clinical advice
- Reply ONLY with valid JSON`;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isUsableIsoDate(value: string | undefined): value is string {
  if (!value) return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function localDateKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function resolveDictationDates(
  fields: Pick<EntryDictationOutput, "startDate" | "endDate" | "datePrecision">,
  today = localDateKey(),
): { startDate: string; endDate: string; datePrecision: DatePrecision } {
  const namedStart = isUsableIsoDate(fields.startDate);
  const startDate = namedStart ? fields.startDate : today;
  const datePrecision = namedStart ? fields.datePrecision : "day";
  const endDate = isUsableIsoDate(fields.endDate) && fields.endDate >= startDate ? fields.endDate : "";
  return { startDate, endDate, datePrecision };
}

export function parseEntryDictationResponse(raw: string) {
  const parsed = JSON.parse(raw) as unknown;
  const result = entryDictationOutputSchema.parse(parsed);
  const lifeAreas = [...new Set(result.lifeAreas)];
  return {
    ...result,
    tags: Array.from(new Set(result.tags.map((tag) => tag.toLowerCase()))),
    momentFlags: [...new Set(result.momentFlags)],
    lifeAreas: lifeAreas.length > 0 ? lifeAreas : ["general"],
  };
}
