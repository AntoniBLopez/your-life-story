"use server";

import { revalidatePath } from "next/cache";
import { env } from "@/shared/lib/env";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import type { ActionResult } from "@/shared/types/action";
import { credentialsSchema, registrationSchema } from "./auth-schemas";

const formToObject = (formData: FormData) => Object.fromEntries(formData.entries());

export async function signInAction(formData: FormData): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = credentialsSchema.safeParse(formToObject(formData));
  const locale = String(formData.get("locale") ?? "es");
  if (!parsed.success) {
    return { ok: false, error: "Revisa los datos de acceso.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: "No hemos podido iniciar sesión. Comprueba tus datos." };

  revalidatePath(`/${locale}/app`);
  return { ok: true, data: { redirectTo: `/${locale}/app` } };
}

export async function signUpAction(formData: FormData): Promise<ActionResult<{ confirmation: boolean }>> {
  const parsed = registrationSchema.safeParse(formToObject(formData));
  const locale = String(formData.get("locale") ?? "es");
  if (!parsed.success) {
    return { ok: false, error: "Revisa los datos del registro.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { displayName, email, password } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName, locale },
      emailRedirectTo: `${env.appUrl}/auth/callback?next=/${locale}/app`,
    },
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true, data: { confirmation: !data.session } };
}

export async function requestPasswordResetAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "");
  const locale = String(formData.get("locale") ?? "es");
  if (!credentialsSchema.shape.email.safeParse(email).success) {
    return { ok: false, error: "Introduce un email válido." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.appUrl}/${locale}/login?mode=update-password`,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}

export async function signOutAction(locale: string) {
  if (env.demoMode) return;
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath(`/${locale}`);
}
