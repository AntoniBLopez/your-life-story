import { describe, expect, it, vi } from "vitest";
import { ATTACHMENT_UPLOAD_PART_BYTES, MAX_ATTACHMENT_BYTES, MAX_AUDIO_ATTACHMENT_BYTES } from "@/modules/life-story/domain/attachment-upload";
import { uploadAttachment } from "./upload-attachment";

const ENTRY_ID = "64b7f0c2a1b2c3d4e5f60718";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function fakeServer(options: { failPartTimes?: number; partStatus?: number; startStatus?: number; startBody?: unknown } = {}) {
  const parts: number[] = [];
  let failures = options.failPartTimes ?? 0;
  const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    if (url === "/api/attachments/uploads" && method === "POST") {
      if (options.startStatus) return json(options.startBody ?? {}, options.startStatus);
      const { size } = JSON.parse(String(init?.body)) as { size: number };
      return json({ uploadId: "u1", partSize: ATTACHMENT_UPLOAD_PART_BYTES, totalParts: Math.ceil(size / ATTACHMENT_UPLOAD_PART_BYTES) });
    }
    const partMatch = /^\/api\/attachments\/uploads\/u1\/parts\/(\d+)$/.exec(url);
    if (partMatch && method === "PUT") {
      if (options.partStatus) return json({ code: "bad_part" }, options.partStatus);
      if (failures > 0) {
        failures -= 1;
        throw new TypeError("Failed to fetch");
      }
      parts.push((init?.body as Blob).size);
      return json({ received: (init?.body as Blob).size });
    }
    if (url === "/api/attachments/uploads/u1/complete" && method === "POST") return json({ id: "att1" });
    if (url === "/api/attachments/uploads/u1" && method === "DELETE") return json(null);
    return json({ code: "server_error" }, 500);
  });
  return { fetchImpl: fetchImpl as unknown as typeof fetch, parts, calls: fetchImpl.mock.calls };
}

function blobOf(size: number, type = "image/png") {
  return new Blob([new Uint8Array(size)], { type });
}

describe("uploadAttachment", () => {
  it("uploads a 2.9 MB image in parts that fit Vercel's body limit", async () => {
    const server = fakeServer();
    const file = blobOf(2_900_000);
    const result = await uploadAttachment({ entryId: ENTRY_ID, file, fileName: "nota.png", contentType: "image/png", locale: "es", fetchImpl: server.fetchImpl });
    expect(result).toEqual({ ok: true, data: { id: "att1" } });
    expect(server.parts).toEqual([2_900_000]);
  });

  it("splits a 15 MB file into several parts", async () => {
    const server = fakeServer();
    const result = await uploadAttachment({ entryId: ENTRY_ID, file: blobOf(MAX_ATTACHMENT_BYTES, "application/pdf"), fileName: "doc.pdf", contentType: "application/pdf", locale: "es", fetchImpl: server.fetchImpl });
    expect(result.ok).toBe(true);
    expect(server.parts.length).toBe(6);
    expect(server.parts.reduce((sum, size) => sum + size, 0)).toBe(MAX_ATTACHMENT_BYTES);
    expect(Math.max(...server.parts)).toBeLessThanOrEqual(ATTACHMENT_UPLOAD_PART_BYTES);
  });

  it("retries a part after a transient network error", async () => {
    const server = fakeServer({ failPartTimes: 1 });
    const result = await uploadAttachment({ entryId: ENTRY_ID, file: blobOf(1000), fileName: "a.png", contentType: "image/png", locale: "es", fetchImpl: server.fetchImpl });
    expect(result.ok).toBe(true);
  });

  it("rejects files over 15 MB in Spanish without contacting the server", async () => {
    const server = fakeServer();
    const result = await uploadAttachment({ entryId: ENTRY_ID, file: blobOf(MAX_ATTACHMENT_BYTES + 1), fileName: "grande.png", contentType: "image/png", locale: "es", fetchImpl: server.fetchImpl });
    expect(result).toEqual({ ok: false, error: "«grande.png» pesa 15 MB y el máximo es 15 MB." });
    expect(server.calls).toHaveLength(0);
  });

  it("returns a clear Spanish message and cancels the upload when the network keeps failing", async () => {
    const server = fakeServer({ failPartTimes: 10 });
    const result = await uploadAttachment({ entryId: ENTRY_ID, file: blobOf(1000), fileName: "foto.png", contentType: "image/png", locale: "es", fetchImpl: server.fetchImpl });
    expect(result).toEqual({ ok: false, error: "No se pudo subir «foto.png»: revisa tu conexión e inténtalo de nuevo." });
    expect(server.calls.some(([url, init]) => url === "/api/attachments/uploads/u1" && init?.method === "DELETE")).toBe(true);
  });

  it("maps server error codes to readable messages", async () => {
    const expired = await uploadAttachment({ entryId: ENTRY_ID, file: blobOf(10), fileName: "a.png", contentType: "image/png", locale: "es", fetchImpl: fakeServer({ startStatus: 401, startBody: { code: "unauthorized" } }).fetchImpl });
    expect(expired).toEqual({ ok: false, error: "Tu sesión ha caducado. Vuelve a iniciar sesión e inténtalo de nuevo." });

    const html500 = fakeServer({ startStatus: 500, startBody: "<html>" });
    const crashed = await uploadAttachment({ entryId: ENTRY_ID, file: blobOf(10), fileName: "a.png", contentType: "image/png", locale: "en", fetchImpl: html500.fetchImpl });
    expect(crashed).toEqual({ ok: false, error: "Could not upload “a.png”. Please try again." });

    const tooLarge = await uploadAttachment({ entryId: ENTRY_ID, file: blobOf(10), fileName: "a.png", contentType: "image/png", locale: "es", fetchImpl: fakeServer({ partStatus: 413 }).fetchImpl });
    expect(tooLarge.ok).toBe(false);
  });
});

describe("uploadAttachment audio limit", () => {
  it("accepts long audio above 15 MB (up to 150 MB) in parts", async () => {
    const server = fakeServer();
    const result = await uploadAttachment({ entryId: ENTRY_ID, file: blobOf(40 * 1024 * 1024, "audio/webm"), fileName: "voz.webm", contentType: "audio/webm", locale: "es", fetchImpl: server.fetchImpl });
    expect(result.ok).toBe(true);
    expect(Math.max(...server.parts)).toBeLessThanOrEqual(ATTACHMENT_UPLOAD_PART_BYTES);
  });

  it("rejects audio over 150 MB in Spanish", async () => {
    const server = fakeServer();
    const result = await uploadAttachment({ entryId: ENTRY_ID, file: blobOf(MAX_AUDIO_ATTACHMENT_BYTES + 1, "audio/mpeg"), fileName: "larga.mp3", contentType: "audio/mpeg", locale: "es", fetchImpl: server.fetchImpl });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/^«larga\.mp3» pesa 150 MB y el máximo es 150 MB/);
    expect(server.calls).toHaveLength(0);
  });

  it("reports upload progress", async () => {
    const progress: number[] = [];
    await uploadAttachment({ entryId: ENTRY_ID, file: blobOf(10 * 1024 * 1024, "audio/webm"), fileName: "voz.webm", contentType: "audio/webm", locale: "es", fetchImpl: fakeServer().fetchImpl, onProgress: (fraction) => progress.push(fraction) });
    expect(progress.at(-1)).toBe(1);
    expect([...progress].sort((a, b) => a - b)).toEqual(progress);
  });
});
