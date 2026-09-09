import { IMAGE_CONTENT_TYPES, resolveAttachmentContentType } from "@/modules/life-story/domain/attachment-content-type";
import type { FamilyPerson } from "../domain/family-graph";
import { deleteFamilyAvatar, storeFamilyAvatar } from "@/shared/lib/mongodb/family-avatars";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export async function processPersonAvatarFromForm(
  userId: string,
  personId: string,
  formData: FormData,
  existing?: Pick<FamilyPerson, "avatarGridFsId" | "avatarMimeType"> | null,
) {
  if (formData.get("removeAvatar") === "true") {
    await deleteFamilyAvatar(existing?.avatarGridFsId);
    return { avatarGridFsId: null, avatarMimeType: null, changed: Boolean(existing?.avatarGridFsId) };
  }

  const fileBase64 = String(formData.get("avatarBase64") ?? "");
  if (!fileBase64) {
    return {
      avatarGridFsId: existing?.avatarGridFsId ?? null,
      avatarMimeType: existing?.avatarMimeType ?? null,
      changed: false,
    };
  }

  const fileName = String(formData.get("avatarFileName") ?? "avatar.jpg");
  const reportedType = String(formData.get("avatarContentType") ?? "");
  const contentType = resolveAttachmentContentType(fileName, reportedType);
  if (!contentType || !IMAGE_CONTENT_TYPES.includes(contentType as (typeof IMAGE_CONTENT_TYPES)[number])) {
    throw new Error("La imagen debe ser JPG, PNG o WebP.");
  }

  const size = Number(formData.get("avatarSize") ?? 0);
  const buffer = Buffer.from(fileBase64, "base64");
  if (!size || buffer.byteLength !== size || buffer.byteLength > MAX_AVATAR_BYTES) {
    throw new Error("La imagen no puede superar 2 MB.");
  }

  await deleteFamilyAvatar(existing?.avatarGridFsId);
  const stored = await storeFamilyAvatar({
    userId,
    personId,
    fileName,
    mimeType: contentType,
    buffer,
  });

  return {
    avatarGridFsId: stored.gridFsId,
    avatarMimeType: stored.mimeType,
    changed: true,
  };
}
