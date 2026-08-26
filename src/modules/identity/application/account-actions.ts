"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/shared/lib/auth";
import { env } from "@/shared/lib/env";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import type { ActionResult } from "@/shared/types/action";

const exportTables = ["profiles", "life_entries", "life_entry_links", "entry_attachments", "family_people", "family_relationships", "chat_threads", "chat_messages"] as const;

export async function exportAccountDataAction(): Promise<ActionResult<Record<string, unknown>>> {
  try {
    const user = await requireCurrentUser(); const supabase = await createSupabaseServerClient();
    const results = await Promise.all(exportTables.map(async (table) => {
      const { data, error } = await supabase.from(table).select("*").eq(table === "profiles" ? "id" : "user_id", user.id);
      if (error) throw error; return [table, data] as const;
    }));
    return { ok: true, data: { exportedAt: new Date().toISOString(), accountId: user.id, ...Object.fromEntries(results) } };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "No se pudo preparar tu exportación." }; }
}

export async function deleteAccountAction(confirmation: string, locale: "es" | "en"): Promise<ActionResult> {
  if (confirmation !== "DELETE") return { ok: false, error: locale === "es" ? "Escribe DELETE para confirmar." : "Type DELETE to confirm." };
  if (!env.supabaseServiceRoleKey) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is required to delete an account." };
  try {
    const user = await requireCurrentUser(); const supabase = await createSupabaseServerClient();
    const { data: attachments, error: attachmentError } = await supabase.from("entry_attachments").select("storage_path").eq("user_id", user.id);
    if (attachmentError) throw attachmentError;
    const admin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    if (attachments?.length) { const { error } = await admin.storage.from("life-attachments").remove(attachments.map((item: any) => item.storage_path)); if (error) throw error; }
    const { error } = await admin.auth.admin.deleteUser(user.id, true);
    if (error) throw error;
    revalidatePath(`/${locale}`);
    return { ok: true, data: undefined };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "No se pudo eliminar la cuenta." }; }
}
