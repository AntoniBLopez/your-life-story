import { z } from "zod";
import { RELATIONSHIP_TYPES } from "../domain/family-graph";

const optionalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).transform((value) => value || null);
const optionalText = z.string().trim().max(120).optional().or(z.literal("")).transform((value) => value || null);

export const familyPersonSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  birthDate: optionalDate,
  birthDatePrecision: z.enum(["day", "month", "year"]).optional().or(z.literal("")).transform((value) => value || null),
  deathDate: optionalDate,
  deathDatePrecision: z.enum(["day", "month", "year"]).optional().or(z.literal("")).transform((value) => value || null),
  birthCountry: optionalText,
  birthCity: optionalText,
  gender: z.enum(["male", "female"]).optional().or(z.literal("")).transform((value) => value || null),
  isSubject: z.boolean().default(false),
});

export const familyRelationshipSchema = z.object({
  sourcePersonId: z.string().uuid(),
  targetPersonId: z.string().uuid(),
  relationshipType: z.enum(RELATIONSHIP_TYPES),
});
