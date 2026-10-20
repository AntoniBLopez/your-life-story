/**
 * Round-trip check of the segmenter against real encoders. Needs `ffmpeg`/`ffprobe` on PATH;
 * skipped otherwise. Each segment must decode on its own and together they must cover the
 * whole recording.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { buildTranscriptionSegment, countTranscriptionSegments } from "./audio-segments";

function hasFfmpeg() {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    execFileSync("ffprobe", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const dir = hasFfmpeg() ? mkdtempSync(path.join(tmpdir(), "yls-audio-")) : "";
afterAll(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
});

const SECONDS = 150;
const SOURCE = ["-f", "lavfi", "-i", `sine=frequency=330:duration=${SECONDS}`, "-f", "lavfi", "-i", `anoisesrc=d=${SECONDS}:a=0.05`, "-filter_complex", "amix=inputs=2", "-ac", "1"];

const FORMATS: { name: string; file: string; args: string[] }[] = [
  { name: "webm/opus (MediaRecorder-like, live)", file: "a.webm", args: ["-c:a", "libopus", "-b:a", "32k", "-f", "webm", "-live", "1"] },
  { name: "webm/opus", file: "b.webm", args: ["-c:a", "libopus", "-b:a", "32k"] },
  { name: "ogg/opus", file: "c.ogg", args: ["-c:a", "libopus", "-b:a", "32k"] },
  { name: "mp3", file: "d.mp3", args: ["-c:a", "libmp3lame", "-b:a", "64k"] },
  { name: "wav", file: "e.wav", args: ["-ar", "16000", "-c:a", "pcm_s16le"] },
  { name: "m4a (moov at end)", file: "f.m4a", args: ["-c:a", "aac", "-b:a", "48k"] },
  { name: "m4a (faststart)", file: "g.m4a", args: ["-c:a", "aac", "-b:a", "48k", "-movflags", "+faststart"] },
  { name: "fragmented mp4 (Safari-like)", file: "h.mp4", args: ["-c:a", "aac", "-b:a", "48k", "-movflags", "frag_keyframe+empty_moov", "-frag_duration", "1000000"] },
];

function probeDuration(file: string) {
  const check = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-f", "null", "-"], { encoding: "utf8" });
  const decodeErrors = check.stderr.trim();
  const json = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "json", file]).toString();
  const reported = Number((JSON.parse(json) as { format?: { duration?: string } }).format?.duration);
  // Decode fully to measure real audio length (container duration may be missing/absolute).
  const decoded = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", "8000", "-f", "s16le", "-"], { maxBuffer: 1 << 28 });
  return { reported, decodedSeconds: decoded.byteLength / 2 / 8000, decodeErrors };
}

describe.skipIf(!dir)("buildTranscriptionSegment with real files", () => {
  for (const format of FORMATS) {
    it(`splits ${format.name} into independently decodable segments`, async () => {
      const file = path.join(dir, format.file);
      execFileSync("ffmpeg", ["-v", "error", "-y", ...SOURCE, ...format.args, file]);
      const bytes = new Uint8Array(readFileSync(file));
      const read = async (start: number, end: number) => bytes.subarray(start, Math.min(end, bytes.byteLength));
      const segmentBytes = Math.ceil(bytes.byteLength / 5);
      const count = countTranscriptionSegments(bytes.byteLength, segmentBytes);

      let total = 0;
      let produced = 0;
      const reportedDurations: Array<[number, number]> = [];
      const decodeErrors: string[] = [];
      for (let index = 0; index < count; index += 1) {
        const segment = await buildTranscriptionSegment(read, bytes.byteLength, index, segmentBytes);
        if (!segment) continue;
        produced += 1;
        const out = path.join(dir, `${format.file}.${index}.${segment.extension}`);
        writeFileSync(out, segment.bytes);
        const probe = probeDuration(out);
        total += probe.decodedSeconds;
        reportedDurations.push([probe.reported, probe.decodedSeconds]);
        decodeErrors.push(...(probe.decodeErrors ? [`segment ${index}: ${probe.decodeErrors}`] : []));
      }
      expect(produced).toBeGreaterThanOrEqual(4);
      expect(total).toBeGreaterThan(SECONDS - 1.5);
      expect(total).toBeLessThan(SECONDS + 1.5);
      expect(decodeErrors).toEqual([]);
      // A slice must not claim the whole recording's length in its header (billing / decoder confusion).
      for (const [reported, decoded] of reportedDurations) {
        if (Number.isFinite(reported)) expect(reported, `${format.name}: header says ${reported}s, audio is ${decoded}s`).toBeLessThan(decoded + 3);
      }
    }, 60_000);
  }
});
