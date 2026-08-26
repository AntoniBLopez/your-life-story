"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser, signOutCurrentUser } from "@/shared/lib/auth";
import { deleteAllUserData, exportUserData } from "@/shared/lib/mongodb/account";
import type { ActionResult } from "@/shared/types/action";

export async function exportAccountDataAction(): Promise<ActionResult<Record<string, unknown>>> {
  try {
    const user = await requireCurrentUser();
    const data = await exportUserData(user.id);
    return { ok: true, data: { exportedAt: new Date().toISOString(), accountId: user.id, ...data } };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "No se pudo preparar tu exportación." }; }
}

export async function deleteAccountAction(confirmation: string, locale: "es" | "en"): Promise<ActionResult> {
  if (confirmation !== "DELETE") return { ok: false, error: locale === "es" ? "Escribe DELETE para confirmar." : "Type DELETE to confirm." };
  try {
    const user = await requireCurrentUser();
    await deleteAllUserData(user.id);
    await signOutCurrentUser();
    revalidatePath(`/${locale}`);
    return { ok: true, data: undefined };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "No se pudo eliminar la cuenta." }; }
}
