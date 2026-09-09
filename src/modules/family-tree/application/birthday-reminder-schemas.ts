import { z } from "zod";
import { REMINDER_UNITS } from "../domain/birthday-reminder";

export const birthdayReminderOffsetSchema = z.object({
  unit: z.enum(REMINDER_UNITS),
  amount: z.number().int().min(0).max(366),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
});

export const birthdayReminderOffsetsSchema = z.array(birthdayReminderOffsetSchema).max(8);

export const birthdayReminderPresetInputSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  name: z.string().trim().min(2).max(80),
  offsets: birthdayReminderOffsetsSchema.min(1),
  isDefault: z.boolean().optional(),
});
