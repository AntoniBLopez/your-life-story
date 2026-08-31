"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminUser, requireCurrentUser } from "@/shared/lib/auth";
import type { ActionResult } from "@/shared/types/action";
import { getProfile, upsertProfile } from "@/modules/identity/infrastructure/mongo-profile-repository";
import {
  allocateArchiveSlug,
  createPublicationRequest,
  findPublicationRequestById,
  publishLife,
  unpublishLife,
  updatePublicationRequestStatus,
} from "@/modules/archive/infrastructure/mongo-archive-repository";
import { parseInactivityReleaseYears, gavePublicPublicationPermission } from "@/modules/archive/domain/archive";
import { findUserById } from "@/modules/identity/infrastructure/mongo-user-repository";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const deathRequestSchema = z.object({
  targetEmail: z.string().trim().email().max(180),
  requesterName: z.string().trim().min(2).max(80),
  requesterEmail: z.string().trim().email().max(180),
  relationship: z.string().trim().min(2).max(80),
  deathDate: z.string().trim().max(10).optional(),
  message: z.string().trim().min(10).max(2000),
  locale: z.enum(["es", "en"]),
});

export async function setPublicArchiveConsentAction(publish: boolean, locale: "es" | "en"): Promise<ActionResult<{ slug: string | null }>> {
  try {
    const user = await requireCurrentUser();
    const profile = await getProfile(user.id);
    if (!profile?.onboardedAt) {
      return { ok: false, error: locale === "es" ? "Completa primero tu bienvenida." : "Finish onboarding first." };
    }
    if (publish) {
      const displayName = profile.displayName ?? user.displayName ?? "Sin nombre";
      const slug = profile.archiveSlug ?? await allocateArchiveSlug(displayName, user.id);
      await upsertProfile(user.id, {
        publicArchiveConsent: true,
        archiveSlug: slug,
        publishedAt: profile.publishedAt ? new Date(profile.publishedAt) : new Date(),
      });
      revalidatePath(`/${locale}/archive`);
      revalidatePath(`/${locale}/archive/${slug}`);
      revalidatePath(`/${locale}/app/settings`);
      return { ok: true, data: { slug } };
    }
    await upsertProfile(user.id, { publicArchiveConsent: false, publishedAt: null });
    revalidatePath(`/${locale}/archive`);
    revalidatePath(`/${locale}/app/settings`);
    return { ok: true, data: { slug: profile.archiveSlug } };
  } catch (error) {
    return { ok: false, error: errorMessage(error, locale === "es" ? "No se pudo guardar la publicación." : "Could not save publication.") };
  }
}

export async function setInactivityReleaseAction(enabled: boolean, years: number, locale: "es" | "en"): Promise<ActionResult<{ years: number | null }>> {
  try {
    const user = await requireCurrentUser();
    const profile = await getProfile(user.id);
    if (!profile?.onboardedAt) {
      return { ok: false, error: locale === "es" ? "Completa primero tu bienvenida." : "Finish onboarding first." };
    }
    if (profile.deceasedAt) {
      return { ok: false, error: locale === "es" ? "Esta cuenta ya está marcada como fallecida." : "This account is already marked as deceased." };
    }
    if (!enabled) {
      await upsertProfile(user.id, {
        inactivityReleaseYears: null,
        inactivityNoticesSent: [],
        inactivityFirstNoticeAt: null,
      });
      revalidatePath(`/${locale}/app/settings`);
      return { ok: true, data: { years: null } };
    }
    const parsedYears = parseInactivityReleaseYears(years);
    if (!parsedYears) {
      return { ok: false, error: locale === "es" ? "Elige un plazo de entre 1 y 10 años." : "Choose a period between 1 and 10 years." };
    }
    await upsertProfile(user.id, {
      inactivityReleaseYears: parsedYears,
      lastSeenAt: profile.lastSeenAt ? new Date(profile.lastSeenAt) : new Date(),
      inactivityNoticesSent: [],
      inactivityFirstNoticeAt: null,
    });
    revalidatePath(`/${locale}/app/settings`);
    return { ok: true, data: { years: parsedYears } };
  } catch (error) {
    return { ok: false, error: errorMessage(error, locale === "es" ? "No se pudo guardar el plazo de silencio." : "Could not save the inactivity period.") };
  }
}

export async function submitDeathDeclarationAction(formData: FormData): Promise<ActionResult> {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const parsed = deathRequestSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: locale === "es" ? "Revisa el correo, tu relación y el mensaje." : "Check the email, your relationship and the message." };
  }
  try {
    const user = await requireCurrentUser();
    if (parsed.data.targetEmail.toLowerCase() === user.email.toLowerCase()) {
      return { ok: false, error: locale === "es" ? "No puedes declarar tu propio fallecimiento." : "You cannot declare your own death." };
    }
    await createPublicationRequest({
      targetEmail: parsed.data.targetEmail,
      requesterUserId: user.id,
      requesterName: parsed.data.requesterName,
      requesterEmail: parsed.data.requesterEmail,
      relationship: parsed.data.relationship,
      deathDate: parsed.data.deathDate || null,
      message: parsed.data.message,
      source: "family",
    });
    revalidatePath(`/${locale}/app/admin`);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: errorMessage(error, locale === "es" ? "No se pudo enviar la declaración." : "The declaration could not be sent.") };
  }
}

export async function submitPublicPublicationRequestAction(formData: FormData): Promise<ActionResult> {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const parsed = deathRequestSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: locale === "es" ? "Revisa los datos de la solicitud." : "Check the request details." };
  }
  try {
    await createPublicationRequest({
      targetEmail: parsed.data.targetEmail,
      requesterUserId: null,
      requesterName: parsed.data.requesterName,
      requesterEmail: parsed.data.requesterEmail,
      relationship: parsed.data.relationship,
      deathDate: parsed.data.deathDate || null,
      message: parsed.data.message,
      source: "public",
    });
    revalidatePath(`/${locale}/app/admin`);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: errorMessage(error, locale === "es" ? "No se pudo enviar la solicitud." : "The request could not be sent.") };
  }
}

export async function reviewPublicationRequestAction(requestId: string, decision: "approved" | "rejected", locale: "es" | "en"): Promise<ActionResult> {
  try {
    const admin = await requireAdminUser();
    const request = await findPublicationRequestById(requestId);
    if (!request) return { ok: false, error: locale === "es" ? "No encontramos esa solicitud." : "That request was not found." };
    if (request.status !== "pending") return { ok: false, error: locale === "es" ? "Esta solicitud ya está resuelta." : "This request has already been reviewed." };

    if (decision === "approved") {
      if (!request.targetUserId) {
        return { ok: false, error: locale === "es" ? "No hay una cuenta con ese email. No se puede publicar." : "There is no account with that email. It cannot be published." };
      }
      const target = await getProfile(request.targetUserId);
      if (!gavePublicPublicationPermission(target ?? {})) {
        return { ok: false, error: locale === "es" ? "Esta persona no dio permiso en vida para publicar su historia. No se puede publicar." : "This person did not give permission in life to publish their story. It cannot be published." };
      }
      await publishLife(request.targetUserId, { deceased: true, deathDate: request.deathDate });
    }
    await updatePublicationRequestStatus(requestId, decision, admin.email);
    const profile = request.targetUserId ? await getProfile(request.targetUserId) : null;
    revalidatePath(`/${locale}/app/admin`);
    revalidatePath(`/${locale}/archive`);
    if (profile?.archiveSlug) revalidatePath(`/${locale}/archive/${profile.archiveSlug}`);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: errorMessage(error, locale === "es" ? "No se pudo revisar la solicitud." : "The request could not be reviewed.") };
  }
}

export async function adminPublishUserAction(userId: string, deceased: boolean, deathDate: string | null, locale: "es" | "en"): Promise<ActionResult> {
  try {
    await requireAdminUser();
    const user = await findUserById(userId);
    if (!user) return { ok: false, error: locale === "es" ? "Usuario no encontrado." : "User not found." };
    const profile = await publishLife(userId, { deceased, deathDate });
    revalidatePath(`/${locale}/app/admin`);
    revalidatePath(`/${locale}/archive`);
    if (profile?.archiveSlug) revalidatePath(`/${locale}/archive/${profile.archiveSlug}`);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: errorMessage(error, locale === "es" ? "No se pudo publicar esta vida." : "This life could not be published.") };
  }
}

export async function adminUnpublishUserAction(userId: string, locale: "es" | "en"): Promise<ActionResult> {
  try {
    await requireAdminUser();
    const profile = await getProfile(userId);
    await unpublishLife(userId);
    revalidatePath(`/${locale}/app/admin`);
    revalidatePath(`/${locale}/archive`);
    if (profile?.archiveSlug) revalidatePath(`/${locale}/archive/${profile.archiveSlug}`);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: errorMessage(error, locale === "es" ? "No se pudo retirar del archivo." : "Could not remove from the archive.") };
  }
}
