"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/shared/lib/auth";
import type { ActionResult } from "@/shared/types/action";
import { upsertProfile, updateProfileFields } from "@/modules/identity/infrastructure/mongo-profile-repository";

export async function grantAiConsentAction(locale: "es" | "en"): Promise<ActionResult> {
  try {
    const user = await requireCurrentUser();
    await upsertProfile(user.id, { aiConsentAt: new Date(), locale });
    revalidatePath(`/${locale}/app/reflect`);
    return { ok: true, data: undefined };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "No se pudo guardar tu consentimiento." }; }
}

export async function revokeAiConsentAction(locale: "es" | "en"): Promise<ActionResult> {
  try {
    const user = await requireCurrentUser();
    await updateProfileFields(user.id, { aiConsentAt: null });
    revalidatePath(`/${locale}/app/reflect`);
    return { ok: true, data: undefined };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "No se pudo retirar el consentimiento." }; }
}
