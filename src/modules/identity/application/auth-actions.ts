"use server";

import { revalidatePath } from "next/cache";
import { createSession, destroySession } from "@/shared/lib/auth/session";
import { env } from "@/shared/lib/env";
import { verifyPassword } from "@/shared/lib/auth/password";
import type { ActionResult } from "@/shared/types/action";
import { credentialsSchema, registrationSchema } from "./auth-schemas";
import { createPasswordResetToken, createUser, findUserByEmail } from "../infrastructure/mongo-user-repository";
import { createProfile, touchLastSeen } from "../infrastructure/mongo-profile-repository";

const formToObject = (formData: FormData) => Object.fromEntries(formData.entries());

export async function signInAction(formData: FormData): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = credentialsSchema.safeParse(formToObject(formData));
  const locale = String(formData.get("locale") ?? "es");
  if (!parsed.success) {
    return { ok: false, error: "Revisa los datos de acceso.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const user = await findUserByEmail(parsed.data.email);
  if (!user?.passwordHash || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { ok: false, error: "No hemos podido iniciar sesión. Comprueba tus datos." };
  }

  await createSession(user.id);
  await touchLastSeen(user.id, { force: true });
  revalidatePath(`/${locale}/app`);
  return { ok: true, data: { redirectTo: `/${locale}/app` } };
}

export async function signUpAction(formData: FormData): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = registrationSchema.safeParse(formToObject(formData));
  const locale = String(formData.get("locale") ?? "es") as "es" | "en";
  if (!parsed.success) {
    return { ok: false, error: "Revisa los datos del registro.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const existing = await findUserByEmail(parsed.data.email);
  if (existing) return { ok: false, error: "Ya existe una cuenta con este email." };

  const { displayName, email, password } = parsed.data;
  const user = await createUser({ email, password, displayName, locale });
  await createProfile(user.id, { displayName, locale });
  await createSession(user.id);

  revalidatePath(`/${locale}/app`);
  return { ok: true, data: { redirectTo: `/${locale}/app` } };
}

export async function requestPasswordResetAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "");
  const locale = String(formData.get("locale") ?? "es");
  if (!credentialsSchema.shape.email.safeParse(email).success) {
    return { ok: false, error: "Introduce un email válido." };
  }

  const user = await findUserByEmail(email);
  if (user) {
    const token = await createPasswordResetToken(user.id);
    if (process.env.NODE_ENV === "development") {
      console.info(`Password reset link: ${env.appUrl}/${locale}/reset-password?token=${token}`);
    }
  }

  return { ok: true, data: undefined };
}

export async function signOutAction(locale: string) {
  await destroySession();
  revalidatePath(`/${locale}`);
}
