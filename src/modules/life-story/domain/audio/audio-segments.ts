/**
 * Splits a stored audio file into standalone, decodable pieces for speech-to-text,
 * reading only the bytes each piece needs (no ffmpeg, no full-file buffering).
 *
 * The file is divided into fixed byte windows of TRANSCRIPTION_SEGMENT_BYTES. Segment `i`
 * holds the container units (WebM clusters, Ogg pages, MP3 frames, WAV blocks, MP4
 * samples/fragments) that *start* inside window `i`, plus the container header when the
 * format needs one. Because boundaries are derived deterministically from the window
 * edges, every segment can be built independently, in any order, and retried.
 */
import { ascii, concatBytes, fourcc, readU16LE, readU32, readU32LE, u32le, type ByteReader } from "./byte-utils";
import { buildMp4Segment, listTopLevelBoxes, parseMp4AudioTrack } from "./mp4";

/** ~6 MB per request: ≈26 min of 32 kbps Opus, ≈6.5 min of 128 kbps MP3; well under Groq's 25 MB. */
export const TRANSCRIPTION_SEGMENT_BYTES = 6 * 1024 * 1024;

export type AudioContainer = "webm" | "ogg" | "mp3" | "wav" | "mp4";

export type AudioSegment = {
  bytes: Uint8Array;
  container: AudioContainer;
  extension: string;
  mimeType: string;
};

export class UnsupportedAudioError extends Error {
  constructor(message = "Unsupported or damaged audio file.") {
    super(message);
  }
}

const CONTAINER_FILE: Record<AudioContainer, { extension: string; mimeType: string }> = {
  webm: { extension: "webm", mimeType: "audio/webm" },
  ogg: { extension: "ogg", mimeType: "audio/ogg" },
  mp3: { extension: "mp3", mimeType: "audio/mpeg" },
  wav: { extension: "wav", mimeType: "audio/wav" },
  mp4: { extension: "m4a", mimeType: "audio/mp4" },
};

export function countTranscriptionSegments(fileSize: number, segmentBytes = TRANSCRIPTION_SEGMENT_BYTES) {
  if (!Number.isFinite(fileSize) || fileSize <= 0) return 0;
  return Math.ceil(fileSize / segmentBytes);
}

export function detectAudioContainer(head: Uint8Array): AudioContainer | null {
  if (head.byteLength >= 4 && head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) return "webm";
  if (ascii(head, 0, 4) === "OggS") return "ogg";
  if (ascii(head, 0, 4) === "RIFF" && ascii(head, 8, 4) === "WAVE") return "wav";
  if (["ftyp", "moov", "mdat", "free", "wide", "skip"].includes(ascii(head, 4, 4))) return "mp4";
  if (ascii(head, 0, 3) === "ID3" || mp3FrameLength(head, 0) > 0) return "mp3";
  return null;
}

// ---------------------------------------------------------------------------
// Boundary validators. Return true when a unit starts at `i`.
// `eof` tells whether the buffer ends at the end of the data.

type Validator = (buf: Uint8Array, i: number, eof: boolean) => boolean;

function readEbmlVintLength(first: number) {
  for (let length = 1; length <= 8; length += 1) {
    if (first & (0x80 >> (length - 1))) return length;
  }
  return 0;
}

const isWebmCluster: Validator = (buf, i) => {
  if (buf[i] !== 0x1f || buf[i + 1] !== 0x43 || buf[i + 2] !== 0xb6 || buf[i + 3] !== 0x75) return false;
  const length = readEbmlVintLength(buf[i + 4] ?? 0);
  if (!length) return false;
  // First child of a cluster is its Timecode element (0xE7).
  return buf[i + 4 + length] === 0xe7;
};

function oggPageLength(buf: Uint8Array, i: number) {
  if (i + 27 > buf.byteLength || ascii(buf, i, 4) !== "OggS" || buf[i + 4] !== 0) return 0;
  const segments = buf[i + 26]!;
  if (i + 27 + segments > buf.byteLength) return 0;
  let body = 0;
  for (let k = 0; k < segments; k += 1) body += buf[i + 27 + k]!;
  return 27 + segments + body;
}

const isOggPacketStart: Validator = (buf, i, eof) => {
  const length = oggPageLength(buf, i);
  if (!length) return false;
  if (buf[i + 5]! & 0x01) return false; // continuation of a packet from the previous page
  const next = i + length;
  if (next + 4 <= buf.byteLength) return ascii(buf, next, 4) === "OggS";
  return eof && next === buf.byteLength;
};

const MP3_BITRATES: Record<string, number[]> = {
  "1-1": [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
  "1-2": [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
  "1-3": [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  "2-1": [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
  "2-2": [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  "2-3": [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
const MP3_SAMPLE_RATES: Record<number, number[]> = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

/** Length in bytes of the MPEG audio frame starting at `i`, or 0 if no valid header is there. */
export function mp3FrameLength(buf: Uint8Array, i: number) {
  if (i + 4 > buf.byteLength) return 0;
  const b1 = buf[i + 1]!;
  const b2 = buf[i + 2]!;
  if (buf[i] !== 0xff || (b1 & 0xe0) !== 0xe0) return 0;
  const versionBits = (b1 >> 3) & 0x03;
  const layerBits = (b1 >> 1) & 0x03;
  const bitrateIndex = b2 >> 4;
  const rateIndex = (b2 >> 2) & 0x03;
  if (versionBits === 1 || layerBits === 0 || bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3) return 0;
  const layer = 4 - layerBits;
  const family = versionBits === 3 ? 1 : 2;
  const bitrate = MP3_BITRATES[`${family}-${layer}`]![bitrateIndex]! * 1000;
  const sampleRate = MP3_SAMPLE_RATES[versionBits]![rateIndex]!;
  const padding = (b2 >> 1) & 0x01;
  if (layer === 1) return (Math.floor((12 * bitrate) / sampleRate) + padding) * 4;
  const perFrame = layer === 3 && family === 2 ? 72 : 144;
  return Math.floor((perFrame * bitrate) / sampleRate) + padding;
}

const isMp3Frame: Validator = (buf, i, eof) => {
  const length = mp3FrameLength(buf, i);
  if (!length) return false;
  const next = i + length;
  if (next + 4 <= buf.byteLength) return mp3FrameLength(buf, next) > 0 || ascii(buf, next, 3) === "TAG";
  return eof;
};

const isMp4Fragment: Validator = (buf, i) => (
  ascii(buf, i + 4, 4) === "moof" && readU32(buf, i) >= 16 && ascii(buf, i + 12, 4) === "mfhd"
);

const SCAN_WINDOW = 1024 * 1024;
const SCAN_MARGIN = 70 * 1024; // max Ogg page (65 307 B) or MP3 frame (2 881 B) look-ahead

/** First offset >= `from` (and < `limit`) where `validate` matches, or `limit` if none. */
async function scanForBoundary(read: ByteReader, from: number, limit: number, validate: Validator) {
  for (let windowStart = from; windowStart < limit; windowStart += SCAN_WINDOW) {
    const windowEnd = Math.min(limit, windowStart + SCAN_WINDOW);
    const readEnd = Math.min(limit, windowEnd + SCAN_MARGIN);
    const buf = await read(windowStart, readEnd);
    const eof = readEnd >= limit;
    for (let i = 0; i < windowEnd - windowStart; i += 1) {
      if (validate(buf, i, eof)) return windowStart + i;
    }
  }
  return limit;
}

// ---------------------------------------------------------------------------
// Container fix-ups so a slice is valid on its own.

/** The copied WebM header declares the full Segment size; mark it "unknown" (EBML all-ones). */
function markWebmSegmentSizeUnknown(header: Uint8Array) {
  const out = header.slice();
  for (let i = 0; i + 5 <= out.byteLength; i += 1) {
    if (out[i] === 0x18 && out[i + 1] === 0x53 && out[i + 2] === 0x80 && out[i + 3] === 0x67) {
      const length = readEbmlVintLength(out[i + 4]!);
      if (!length || i + 4 + length > out.byteLength) break;
      out[i + 4] = (0xff >> (length - 1)) | (0x80 >> (length - 1));
      for (let k = 1; k < length; k += 1) out[i + 4 + k] = 0xff;
      break;
    }
  }
  voidWebmDuration(out);
  return out;
}

/**
 * The original Info/Duration (whole recording) would make each slice claim the full
 * length; overwrite it in place with an EBML Void element of the same size.
 */
function voidWebmDuration(header: Uint8Array) {
  for (let i = 0; i + 4 <= header.byteLength; i += 1) {
    if (header[i] !== 0x15 || header[i + 1] !== 0x49 || header[i + 2] !== 0xa9 || header[i + 3] !== 0x66) continue;
    const end = Math.min(header.byteLength, i + 4 + 256);
    for (let j = i + 4; j + 3 <= end; j += 1) {
      if (header[j] !== 0x44 || header[j + 1] !== 0x89) continue;
      const sizeByte = header[j + 2]!;
      if (sizeByte !== 0x84 && sizeByte !== 0x88) continue;
      const payload = sizeByte & 0x0f;
      if (j + 3 + payload > header.byteLength) return;
      // Void (0xEC) + 2-byte size keeps the total length: 1 + 2 + payload == 2 + 1 + payload.
      header[j] = 0xec;
      header[j + 1] = 0x40;
      header[j + 2] = payload;
      header.fill(0, j + 3, j + 3 + payload);
      return;
    }
    return;
  }
}

/**
 * Fragmented MP4 slices: drop the trailing `mfra` index (it points into the original file)
 * and shift explicit `tfhd` base-data-offsets to the slice's new positions.
 */
function rebaseMp4Fragments(body: Uint8Array, start: number, newStart: number) {
  const delta = newStart - start;
  let out = body.slice();
  let offset = 0;
  let firstDecodeTime: number | null = null;
  while (offset + 8 <= out.byteLength) {
    const size = readU32(out, offset);
    const type = ascii(out, offset + 4, 4);
    if (size < 8) break;
    if (type === "mfra") {
      out = out.subarray(0, offset);
      break;
    }
    if (type === "moof") {
      const view = new DataView(out.buffer, out.byteOffset);
      for (let traf = offset + 8; traf + 8 <= offset + size;) {
        const trafSize = readU32(out, traf);
        if (trafSize < 8) break;
        if (ascii(out, traf + 4, 4) === "traf") {
          for (let child = traf + 8; child + 8 <= traf + trafSize;) {
            const childSize = readU32(out, child);
            if (childSize < 8) break;
            const childType = ascii(out, child + 4, 4);
            if (childType === "tfhd" && (out[child + 11]! & 0x01) && delta !== 0) {
              const position = child + 16;
              const next = view.getUint32(position) * 2 ** 32 + view.getUint32(position + 4) + delta;
              view.setUint32(position, Math.floor(next / 2 ** 32));
              view.setUint32(position + 4, next >>> 0);
            }
            if (childType === "tfdt") {
              // Start the slice's timeline at 0 so it doesn't claim the earlier audio's time.
              const wide = out[child + 8] === 1;
              const position = child + 12;
              const current = wide ? view.getUint32(position) * 2 ** 32 + view.getUint32(position + 4) : view.getUint32(position);
              firstDecodeTime ??= current;
              const next = Math.max(0, current - firstDecodeTime);
              if (wide) {
                view.setUint32(position, Math.floor(next / 2 ** 32));
                view.setUint32(position + 4, next >>> 0);
              } else {
                view.setUint32(position, next);
              }
            }
            child += childSize;
          }
        }
        traf += trafSize;
      }
    }
    offset += size;
  }
  return out;
}

const OGG_CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let r = i << 24;
    for (let k = 0; k < 8; k += 1) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1;
    table[i] = r >>> 0;
  }
  return table;
})();

function oggCrc(page: Uint8Array) {
  let crc = 0;
  for (let i = 0; i < page.byteLength; i += 1) crc = ((crc << 8) ^ OGG_CRC_TABLE[((crc >>> 24) ^ page[i]!) & 0xff]!) >>> 0;
  return crc;
}

/** Shifts every page's granule position down by `base` (so a slice starts near 0) and re-signs it. */
function rebaseOggGranules(body: Uint8Array, base: bigint) {
  if (base <= BigInt(0)) return body;
  const out = body.slice();
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  for (let offset = 0; offset < out.byteLength;) {
    const length = oggPageLength(out, offset);
    if (!length || offset + length > out.byteLength) break;
    const granule = view.getBigUint64(offset + 6, true);
    if (granule !== BigInt("0xffffffffffffffff")) {
      view.setBigUint64(offset + 6, granule > base ? granule - base : BigInt(0), true);
      view.setUint32(offset + 22, 0, true);
      view.setUint32(offset + 22, oggCrc(out.subarray(offset, offset + length)), true);
    }
    offset += length;
  }
  return out;
}

/** Granule position of the Ogg page that ends exactly at `position` (the one before a slice). */
async function oggGranuleBefore(read: ByteReader, dataStart: number, position: number) {
  if (position <= dataStart) return BigInt(0);
  const from = Math.max(dataStart, position - SCAN_MARGIN);
  const bytes = await read(from, position);
  for (let i = bytes.byteLength - 27; i >= 0; i -= 1) {
    if (bytes[i] !== 0x4f || ascii(bytes, i, 4) !== "OggS") continue;
    if (i + oggPageLength(bytes, i) !== bytes.byteLength) continue;
    const granule = new DataView(bytes.buffer, bytes.byteOffset + i + 6, 8).getBigUint64(0, true);
    if (granule !== BigInt("0xffffffffffffffff")) return granule;
  }
  return BigInt(0);
}

/**
 * Drops a leading Xing/Info/VBRI frame: it states the whole file's frame count, so a slice
 * would otherwise claim the full recording's duration.
 */
function dropMp3InfoFrame(body: Uint8Array) {
  let position = 0;
  if (ascii(body, 0, 3) === "ID3" && body.byteLength >= 10) {
    const size = ((body[6]! & 0x7f) << 21) | ((body[7]! & 0x7f) << 14) | ((body[8]! & 0x7f) << 7) | (body[9]! & 0x7f);
    position = 10 + size + (body[5]! & 0x10 ? 10 : 0);
  }
  const length = mp3FrameLength(body, position);
  if (!length) return body;
  const frameText = ascii(body, position, Math.min(length, 200));
  if (!/Xing|Info|VBRI/.test(frameText)) return body;
  return concatBytes([body.subarray(0, position), body.subarray(position + length)]);
}

// ---------------------------------------------------------------------------

type ScannedLayout = {
  kind: "scanned";
  container: AudioContainer;
  dataStart: number;
  dataEnd: number;
  prefix: (bodyLength: number) => Uint8Array;
  boundaryAtOrAfter: (position: number) => Promise<number>;
  /** Fixes absolute offsets inside a body copied from `start` that will sit at `newStart`. */
  transformBody?: (body: Uint8Array, start: number, newStart: number) => Uint8Array | Promise<Uint8Array>;
};

type Mp4SampleLayout = { kind: "mp4-samples"; container: "mp4"; moovOffset: number; moovSize: number };

async function resolveLayout(read: ByteReader, fileSize: number): Promise<ScannedLayout | Mp4SampleLayout> {
  const head = await read(0, Math.min(fileSize, 64 * 1024));
  const container = detectAudioContainer(head);
  if (!container) throw new UnsupportedAudioError();

  const scanned = (validate: Validator, dataStart: number, prefixBytes: Uint8Array, dataEnd = fileSize): ScannedLayout => ({
    kind: "scanned",
    container,
    dataStart,
    dataEnd,
    prefix: () => prefixBytes,
    boundaryAtOrAfter: (position) => scanForBoundary(read, Math.max(position, dataStart), dataEnd, validate),
  });

  if (container === "webm") {
    const firstCluster = await scanForBoundary(read, 0, fileSize, isWebmCluster);
    if (firstCluster >= fileSize) throw new UnsupportedAudioError();
    return scanned(isWebmCluster, firstCluster, markWebmSegmentSizeUnknown(await read(0, firstCluster)));
  }

  if (container === "mp3") return { ...scanned(isMp3Frame, 0, new Uint8Array(0)), transformBody: dropMp3InfoFrame };

  if (container === "ogg") {
    // Header pages (identification, comments, setup) carry granule position 0.
    let offset = 0;
    for (let guard = 0; guard < 64 && offset < fileSize; guard += 1) {
      const page = await read(offset, Math.min(fileSize, offset + 65_536 + 282));
      const length = oggPageLength(page, 0);
      if (!length) throw new UnsupportedAudioError();
      const granuleIsZero = page.subarray(6, 14).every((byte) => byte === 0);
      if (!granuleIsZero) break;
      offset += length;
    }
    const dataStart = offset;
    return {
      ...scanned(isOggPacketStart, dataStart, await read(0, dataStart)),
      transformBody: async (body, start) => rebaseOggGranules(body, await oggGranuleBefore(read, dataStart, start)),
    };
  }

  if (container === "wav") {
    let offset = 12;
    let fmt: Uint8Array | null = null;
    while (offset + 8 <= fileSize) {
      const chunkHead = await read(offset, offset + 8);
      const id = ascii(chunkHead, 0, 4);
      const size = readU32LE(chunkHead, 4);
      if (id === "fmt ") fmt = await read(offset, offset + 8 + size);
      if (id === "data") {
        if (!fmt) throw new UnsupportedAudioError();
        const blockAlign = Math.max(1, readU16LE(fmt, 8 + 12));
        const dataStart = offset + 8;
        const dataEnd = size === 0xffffffff || size === 0 ? fileSize : Math.min(fileSize, dataStart + size);
        const fmtChunk = fmt;
        return {
          kind: "scanned",
          container,
          dataStart,
          dataEnd,
          prefix: (bodyLength) => concatBytes([
            fourcc("RIFF"), u32le(4 + fmtChunk.byteLength + 8 + bodyLength), fourcc("WAVE"), fmtChunk, fourcc("data"), u32le(bodyLength),
          ]),
          boundaryAtOrAfter: async (position) => {
            if (position <= dataStart) return dataStart;
            return Math.min(dataEnd, dataStart + Math.ceil((position - dataStart) / blockAlign) * blockAlign);
          },
        };
      }
      offset += 8 + size + (size % 2);
    }
    throw new UnsupportedAudioError();
  }

  const boxes = await listTopLevelBoxes(read, fileSize);
  const firstFragment = boxes.find((item) => item.type === "moof");
  if (firstFragment) {
    const layout = scanned(isMp4Fragment, firstFragment.offset, await read(0, firstFragment.offset));
    return { ...layout, transformBody: rebaseMp4Fragments };
  }
  const moov = boxes.find((item) => item.type === "moov");
  if (!moov) throw new UnsupportedAudioError();
  return { kind: "mp4-samples", container: "mp4", moovOffset: moov.offset, moovSize: moov.size };
}

/**
 * Builds segment `index` of a stored audio file, or returns null when that byte window
 * contains no audio (e.g. it only covers the container header).
 */
export async function buildTranscriptionSegment(
  read: ByteReader,
  fileSize: number,
  index: number,
  segmentBytes = TRANSCRIPTION_SEGMENT_BYTES,
): Promise<AudioSegment | null> {
  if (!Number.isInteger(index) || index < 0 || index * segmentBytes >= fileSize) return null;
  const layout = await resolveLayout(read, fileSize);
  const file = CONTAINER_FILE[layout.container];
  const windowStart = index * segmentBytes;
  const windowEnd = (index + 1) * segmentBytes;

  if (layout.kind === "mp4-samples") {
    const track = parseMp4AudioTrack(await read(layout.moovOffset, layout.moovOffset + layout.moovSize));
    if (!track) throw new UnsupportedAudioError();
    let first = -1;
    let last = -1;
    for (let sample = 0; sample < track.offsets.length; sample += 1) {
      const offset = track.offsets[sample]!;
      if (offset >= windowStart && offset < windowEnd) {
        if (first < 0) first = sample;
        last = sample + 1;
      }
    }
    if (first < 0) return null;
    const spanStart = track.offsets[first]!;
    const spanEnd = track.offsets[last - 1]! + track.sizes[last - 1]!;
    const span = await read(spanStart, spanEnd);
    const parts: Uint8Array[] = [];
    for (let sample = first; sample < last; sample += 1) {
      const relative = track.offsets[sample]! - spanStart;
      parts.push(span.subarray(relative, relative + track.sizes[sample]!));
    }
    return { bytes: buildMp4Segment(track, first, last, concatBytes(parts)), container: "mp4", ...file };
  }

  const start = index === 0 ? layout.dataStart : await layout.boundaryAtOrAfter(windowStart);
  const end = windowEnd >= layout.dataEnd ? layout.dataEnd : await layout.boundaryAtOrAfter(windowEnd);
  if (start >= end) return null;
  let body = await read(start, end);
  const prefixLength = layout.prefix(body.byteLength).byteLength;
  if (layout.transformBody) body = await layout.transformBody(body, start, prefixLength);
  return { bytes: concatBytes([layout.prefix(body.byteLength), body]), container: layout.container, ...file };
}
