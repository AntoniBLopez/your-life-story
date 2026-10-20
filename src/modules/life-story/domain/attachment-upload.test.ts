import { describe, expect, it } from "vitest";
import {
  ATTACHMENT_CHUNKS_PER_PART,
  ATTACHMENT_GRIDFS_CHUNK_BYTES,
  ATTACHMENT_UPLOAD_PART_BYTES,
  MAX_ATTACHMENT_BYTES,
  MAX_AUDIO_ATTACHMENT_BYTES,
  maxAttachmentBytes,
  countGridFsChunks,
  countUploadParts,
  expectedPartBytes,
  partByteRange,
  splitPartIntoGridFsChunks,
} from "./attachment-upload";

const VERCEL_BODY_LIMIT = 4.5 * 1000 * 1000;

describe("attachment upload parts", () => {
  it("keeps every part below Vercel's 4.5 MB body limit and aligned to GridFS chunks", () => {
    expect(ATTACHMENT_UPLOAD_PART_BYTES).toBeLessThan(VERCEL_BODY_LIMIT);
    expect(ATTACHMENT_UPLOAD_PART_BYTES % ATTACHMENT_GRIDFS_CHUNK_BYTES).toBe(0);
  });

  it("counts parts and chunks", () => {
    expect(countUploadParts(0)).toBe(0);
    expect(countUploadParts(100 * 1024)).toBe(1);
    expect(countUploadParts(ATTACHMENT_UPLOAD_PART_BYTES)).toBe(1);
    expect(countUploadParts(ATTACHMENT_UPLOAD_PART_BYTES + 1)).toBe(2);
    expect(countUploadParts(MAX_ATTACHMENT_BYTES)).toBe(6);
    expect(countGridFsChunks(2_900_000)).toBe(12);
    expect(countGridFsChunks(ATTACHMENT_GRIDFS_CHUNK_BYTES + 1)).toBe(2);
  });

  it("computes the exact size of each part, including the last one", () => {
    const size = 2 * ATTACHMENT_UPLOAD_PART_BYTES + 10;
    expect(expectedPartBytes(size, 0)).toBe(ATTACHMENT_UPLOAD_PART_BYTES);
    expect(expectedPartBytes(size, 1)).toBe(ATTACHMENT_UPLOAD_PART_BYTES);
    expect(expectedPartBytes(size, 2)).toBe(10);
    expect(expectedPartBytes(size, 3)).toBeNull();
    expect(expectedPartBytes(size, -1)).toBeNull();
    expect(expectedPartBytes(size, 0.5)).toBeNull();
    expect(partByteRange(size, 2)).toEqual({ start: 2 * ATTACHMENT_UPLOAD_PART_BYTES, end: size });
  });

  it("splits a part into GridFS chunks numbered across the whole file", () => {
    const part = new Uint8Array(ATTACHMENT_GRIDFS_CHUNK_BYTES * 2 + 5).map((_, i) => i % 251);
    const chunks = splitPartIntoGridFsChunks(1, part);
    expect(chunks.map((chunk) => chunk.n)).toEqual([
      ATTACHMENT_CHUNKS_PER_PART,
      ATTACHMENT_CHUNKS_PER_PART + 1,
      ATTACHMENT_CHUNKS_PER_PART + 2,
    ]);
    expect(chunks.map((chunk) => chunk.data.byteLength)).toEqual([ATTACHMENT_GRIDFS_CHUNK_BYTES, ATTACHMENT_GRIDFS_CHUNK_BYTES, 5]);
    const joined = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.data.byteLength, 0));
    let offset = 0;
    for (const chunk of chunks) {
      joined.set(chunk.data, offset);
      offset += chunk.data.byteLength;
    }
    expect(joined).toEqual(part);
  });
});

describe("per-type size limits", () => {
  it("allows 150 MB for audio (5 h at 64 kbps) and keeps 15 MB for other files", () => {
    expect(maxAttachmentBytes("audio/webm")).toBe(MAX_AUDIO_ATTACHMENT_BYTES);
    expect(maxAttachmentBytes("image/png")).toBe(MAX_ATTACHMENT_BYTES);
    expect(MAX_AUDIO_ATTACHMENT_BYTES).toBeGreaterThan((64_000 / 8) * 5 * 3600);
    expect(countUploadParts(MAX_AUDIO_ATTACHMENT_BYTES)).toBeLessThan(100);
  });
});
