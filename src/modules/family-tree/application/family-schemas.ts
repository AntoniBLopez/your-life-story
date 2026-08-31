import { z } from "zod";
import { RELATIONSHIP_TYPES } from "../domain/family-graph";

const optionalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).transform((value) => value || null);
const optionalText = z.string().trim().max(120).optional().or(z.literal("")).transform((value) => value || null);
const optionalPersonId = z.string().uuid().optional().or(z.literal("")).transform((value) => value || null);

export const familyNodeLayoutSchema = z.object({
  positions: z.array(z.object({
    personId: z.string().uuid(),
    x: z.number().finite(),
    y: z.number().finite(),
  })).min(1).max(80),
});

export const familyPersonSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  birthDate: optionalDate,
  birthDatePrecision: z.enum(["day", "month", "year"]).optional().or(z.literal("")).transform((value) => value || null),
  deathDate: optionalDate,
  deathDatePrecision: z.enum(["day", "month", "year"]).optional().or(z.literal("")).transform((value) => value || null),
  birthCountry: optionalText,
  birthCity: optionalText,
  gender: z.enum(["male", "female"]).optional().or(z.literal("")).transform((value) => value || null),
  baptized: z.enum(["true", "false", "unknown"]).optional().or(z.literal("")).transform((value) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return null;
  }),
  notes: z.string().trim().max(300).optional().or(z.literal("")).transform((value) => value || null),
  email: z.string().trim().max(180).optional().or(z.literal("")).transform((value) => {
    const email = (value || "").trim().toLowerCase();
    return email || null;
  }),
  isSubject: z.boolean().default(false),
  motherId: optionalPersonId,
  fatherId: optionalPersonId,
}).refine((data) => !data.email || z.string().email().safeParse(data.email).success, {
  message: "Introduce un email válido.",
}).refine((data) => !data.motherId || !data.fatherId || data.motherId !== data.fatherId, {
  message: "La madre y el padre deben ser personas distintas.",
});

export const familyRelationshipSchema = z.object({
  sourcePersonId: z.string().uuid(),
  targetPersonId: z.string().uuid(),
  relationshipType: z.enum(RELATIONSHIP_TYPES),
});
