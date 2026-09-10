import { ObjectId } from "mongodb";
import { z } from "zod";
import { CHANGE_DIRECTIONS, DATE_PRECISIONS, LIFE_AREAS, LIFE_ENTRY_TEXT_MAX, LIFE_ENTRY_TITLE_MAX, MOMENT_FLAGS } from "../domain/life-entry";
import { HUMAN_TEXT_ORIGINS } from "../domain/life-entry-text-origin";

const textTooLong = `Este texto puede tener hasta ${LIFE_ENTRY_TEXT_MAX.toLocaleString("es-ES")} caracteres.`;
const optionalText = z.string().trim().max(LIFE_ENTRY_TEXT_MAX, textTooLong).optional().transform((value) => value || null);
const humanTextOrigin = z.enum(HUMAN_TEXT_ORIGINS).nullable();

const textOriginsSchema = z.object({
  title: humanTextOrigin,
  narrative: humanTextOrigin,
  difficulty: humanTextOrigin,
  learning: humanTextOrigin,
  transformation: humanTextOrigin,
});

const textContainsAiSchema = z.object({
  title: z.boolean(),
  narrative: z.boolean(),
  difficulty: z.boolean(),
  learning: z.boolean(),
  transformation: z.boolean(),
});

export const lifeEntryInputSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige una fecha inicial."),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).transform((value) => value || null),
  datePrecision: z.enum(DATE_PRECISIONS),
  title: z.string().trim().min(2, "Escribe un título.").max(LIFE_ENTRY_TITLE_MAX),
  narrative: optionalText,
  lifeAreas: z.array(z.enum(LIFE_AREAS)).min(1, "Elige al menos un área."),
  lifeArea: z.enum(LIFE_AREAS).optional(),
  changeDirection: z.enum(CHANGE_DIRECTIONS),
  momentFlags: z.array(z.enum(MOMENT_FLAGS)).default([]),
  difficulty: optionalText,
  learning: optionalText,
  transformation: optionalText,
  tags: z.string().max(400).transform((value) => Array.from(new Set(value.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean))).slice(0, 12)),
  linkedEntryId: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value === "" || ObjectId.isValid(value), "Elige una experiencia válida.")
    .transform((value) => value || null),
  linkType: z.enum(["related", "consequence"]),
  textOrigins: textOriginsSchema,
  textContainsAi: textContainsAiSchema,
  aiClassified: z.union([
    z.boolean(),
    z.enum(["true", "false"]).transform((value) => value === "true"),
  ]),
}).transform((value) => {
  const empty = {
    title: false,
    narrative: !value.narrative,
    difficulty: !value.difficulty,
    learning: !value.learning,
    transformation: !value.transformation,
  } as const;
  return {
    ...value,
    textOrigins: {
      title: value.textOrigins.title,
      narrative: empty.narrative ? null : value.textOrigins.narrative,
      difficulty: empty.difficulty ? null : value.textOrigins.difficulty,
      learning: empty.learning ? null : value.textOrigins.learning,
      transformation: empty.transformation ? null : value.textOrigins.transformation,
    },
    textContainsAi: {
      title: value.textContainsAi.title,
      narrative: empty.narrative ? false : value.textContainsAi.narrative,
      difficulty: empty.difficulty ? false : value.textContainsAi.difficulty,
      learning: empty.learning ? false : value.textContainsAi.learning,
      transformation: empty.transformation ? false : value.textContainsAi.transformation,
    },
  };
});

export type LifeEntryInput = z.output<typeof lifeEntryInputSchema>;
