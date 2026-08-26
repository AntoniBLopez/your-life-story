"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCurrentUser } from "@/shared/lib/auth";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import type { ActionResult } from "@/shared/types/action";

export async function completeOnboardingAction(formData: FormData): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = z.object({ displayName: z.string().trim().min(2).max(80), locale: z.enum(["es", "en"]), firstMoment: z.enum(["now", "later"]) }).safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: "Revisa tu nombre." };
  try {
    const user = await requireCurrentUser(); const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("profiles").upsert({ id: user.id, display_name: parsed.data.displayName, locale: parsed.data.locale, onboarded_at: new Date().toISOString() }, { onConflict: "id" });
    if (error) throw error;
    const base = `/${parsed.data.locale}/app`;
    revalidatePath(base);
    return { ok: true, data: { redirectTo: parsed.data.firstMoment === "now" ? `${base}/entries/new` : base } };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "No se pudo guardar tu bienvenida." }; }
}
