/**
 * Chunked attachment uploads.
 *
 * Attachments live in MongoDB GridFS. Vercel functions reject request bodies
 * above ~4.5 MB and Next.js Server Actions above 1 MB, so the browser sends a
 * file in parts that are each well under those limits. Every part is a whole
 * number of GridFS chunks, which lets the server write each part straight into
 * the GridFS chunks collection without buffering the full file anywhere.
 */

/** Largest image/PDF attachment the app accepts (advertised in the UI). */
export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

/**
 * Largest audio attachment. 150 MB holds ~10 h recorded in the app (32 kbps Opus,
 * ~14 MB/h) and ~5 h of a typical 64 kbps phone voice memo, while one file can't take more
 * than ~30 % of a 512 MB MongoDB Atlas free cluster. Transcription cost doesn't depend
 * on this: audio is transcribed in ~6 MB segments.
 */
export const MAX_AUDIO_ATTACHMENT_BYTES = 150 * 1024 * 1024;

export function maxAttachmentBytes(contentType: string) {
  return contentType.startsWith("audio/") ? MAX_AUDIO_ATTACHMENT_BYTES : MAX_ATTACHMENT_BYTES;
}

/** GridFS chunk size used for chunked uploads (the GridFS default, 255 KiB). */
export const ATTACHMENT_GRIDFS_CHUNK_BYTES = 255 * 1024;

/** GridFS chunks per uploaded part: 12 × 255 KiB ≈ 3 MB, safely below Vercel's 4.5 MB body limit. */
export const ATTACHMENT_CHUNKS_PER_PART = 12;

/** Bytes per uploaded part (always a multiple of the GridFS chunk size). */
export const ATTACHMENT_UPLOAD_PART_BYTES = ATTACHMENT_GRIDFS_CHUNK_BYTES * ATTACHMENT_CHUNKS_PER_PART;

/** Unfinished uploads older than this are discarded. */
export const ATTACHMENT_UPLOAD_TTL_MS = 6 * 60 * 60 * 1000;

export function countUploadParts(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return 0;
  return Math.ceil(sizeBytes / ATTACHMENT_UPLOAD_PART_BYTES);
}

export function countGridFsChunks(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return 0;
  return Math.ceil(sizeBytes / ATTACHMENT_GRIDFS_CHUNK_BYTES);
}

/** Exact byte length the part at `partIndex` must have for a file of `sizeBytes`. */
export function expectedPartBytes(sizeBytes: number, partIndex: number) {
  const parts = countUploadParts(sizeBytes);
  if (!Number.isInteger(partIndex) || partIndex < 0 || partIndex >= parts) return null;
  const start = partIndex * ATTACHMENT_UPLOAD_PART_BYTES;
  return Math.min(ATTACHMENT_UPLOAD_PART_BYTES, sizeBytes - start);
}

/** Byte range [start, end) of a part inside the original file. */
export function partByteRange(sizeBytes: number, partIndex: number) {
  const length = expectedPartBytes(sizeBytes, partIndex);
  if (length === null) return null;
  const start = partIndex * ATTACHMENT_UPLOAD_PART_BYTES;
  return { start, end: start + length };
}

/** Splits an uploaded part into GridFS chunks with their absolute chunk numbers. */
export function splitPartIntoGridFsChunks(partIndex: number, part: Uint8Array) {
  const chunks: { n: number; data: Uint8Array }[] = [];
  for (let offset = 0, i = 0; offset < part.byteLength; offset += ATTACHMENT_GRIDFS_CHUNK_BYTES, i += 1) {
    chunks.push({
      n: partIndex * ATTACHMENT_CHUNKS_PER_PART + i,
      data: part.subarray(offset, Math.min(offset + ATTACHMENT_GRIDFS_CHUNK_BYTES, part.byteLength)),
    });
  }
  return chunks;
}
