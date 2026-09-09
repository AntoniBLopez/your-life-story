import { GridFSBucket, ObjectId } from "mongodb";
import { getDb } from "@/shared/lib/mongodb/client";
import { GRIDFS_BUCKET } from "@/shared/lib/mongodb/collections";

function getBucket() {
  return new GridFSBucket(getDb() as unknown as import("mongodb").Db, { bucketName: GRIDFS_BUCKET });
}

export async function storeFamilyAvatar(input: {
  userId: string;
  personId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}) {
  const bucket = getBucket();
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
  const storagePath = `${input.userId}/family/${input.personId}/${crypto.randomUUID()}-${safeName}`;

  const gridFsId = await new Promise<string>((resolve, reject) => {
    const stream = bucket.openUploadStream(storagePath, {
      metadata: {
        userId: input.userId,
        personId: input.personId,
        contentType: input.mimeType,
        kind: "family-avatar",
      },
    });
    stream.on("error", reject);
    stream.on("finish", () => resolve(stream.id.toString()));
    stream.end(input.buffer);
  });

  return { gridFsId, mimeType: input.mimeType };
}

export async function deleteFamilyAvatar(gridFsId: string | null | undefined) {
  if (!gridFsId) return;
  const bucket = getBucket();
  try {
    await bucket.delete(new ObjectId(gridFsId));
  } catch {
    // File may already be missing.
  }
}

export async function deleteFamilyAvatars(gridFsIds: Array<string | null | undefined>) {
  await Promise.all(gridFsIds.map((gridFsId) => deleteFamilyAvatar(gridFsId)));
}

export async function openFamilyAvatarStream(gridFsId: string) {
  const bucket = getBucket();
  return bucket.openDownloadStream(new ObjectId(gridFsId));
}
