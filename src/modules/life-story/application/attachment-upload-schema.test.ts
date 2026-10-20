import { describe, expect, it } from "vitest";
import { beginAttachmentUploadSchema } from "./attachment-upload-schema";

const base = { entryId: "64b7f0c2a1b2c3d4e5f60718", locale: "es" };

describe("beginAttachmentUploadSchema size limits", () => {
  it("accepts 100 MB audio but not 100 MB images", () => {
    expect(beginAttachmentUploadSchema.safeParse({ ...base, fileName: "voz.webm", contentType: "audio/webm", size: 100 * 1024 * 1024 }).success).toBe(true);
    expect(beginAttachmentUploadSchema.safeParse({ ...base, fileName: "foto.png", contentType: "image/png", size: 100 * 1024 * 1024 }).success).toBe(false);
  });

  it("rejects audio over 150 MB", () => {
    expect(beginAttachmentUploadSchema.safeParse({ ...base, fileName: "voz.mp3", contentType: "audio/mpeg", size: 151 * 1024 * 1024 }).success).toBe(false);
  });
});
