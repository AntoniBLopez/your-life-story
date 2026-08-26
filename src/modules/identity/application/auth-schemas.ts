import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.string().trim().email("Introduce un email válido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

export const registrationSchema = credentialsSchema.extend({
  displayName: z.string().trim().min(2, "Escribe al menos 2 caracteres.").max(80),
  acceptedAdultTerms: z.literal("true", {
    error: "Debes confirmar que tienes al menos 18 años.",
  }),
});
