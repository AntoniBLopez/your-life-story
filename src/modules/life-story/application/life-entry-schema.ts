import { z } from "zod";
import { CHANGE_DIRECTIONS, DATE_PRECISIONS, LIFE_AREAS } from "../domain/life-entry";

const optionalText = z.string().trim().max(4000).optional().transform((value) => value || null);

export const lifeEntryInputSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige una fecha inicial."),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).transform((value) => value || null),
  datePrecision: z.enum(DATE_PRECISIONS),
  title: z.string().trim().min(2, "Escribe un título.").max(160),
  narrative: optionalText,
  lifeAreas: z.array(z.enum(LIFE_AREAS)).min(1, "Elige al menos un área."),
  lifeArea: z.enum(LIFE_AREAS).optional(),
  changeDirection: z.enum(CHANGE_DIRECTIONS),
  difficulty: optionalText,
  learning: optionalText,
  transformation: optionalText,
  tags: z.string().max(400).transform((value) => Array.from(new Set(value.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean))).slice(0, 12)),
  linkedEntryId: z.string().uuid().optional().or(z.literal("")).transform((value) => value || null),
  linkType: z.enum(["related", "consequence"]),
});

export type LifeEntryInput = z.output<typeof lifeEntryInputSchema>;
