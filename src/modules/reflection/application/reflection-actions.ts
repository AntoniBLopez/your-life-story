"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/shared/lib/auth";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import type { ActionResult } from "@/shared/types/action";

export async function grantAiConsentAction(locale: "es" | "en"): Promise<ActionResult> {
  try {
    const user = await requireCurrentUser();
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("profiles").upsert({ id: user.id, ai_consent_at: new Date().toISOString(), locale }, { onConflict: "id" });
    if (error) throw error;
    revalidatePath(`/${locale}/app/reflect`);
    return { ok: true, data: undefined };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "No se pudo guardar tu consentimiento." }; }
}

export async function revokeAiConsentAction(locale: "es" | "en"): Promise<ActionResult> {
  try {
    const user = await requireCurrentUser();
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("profiles").update({ ai_consent_at: null }).eq("id", user.id);
    if (error) throw error;
    revalidatePath(`/${locale}/app/reflect`);
    return { ok: true, data: undefined };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "No se pudo retirar el consentimiento." }; }
}
