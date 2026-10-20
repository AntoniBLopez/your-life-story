import { ascii, concatBytes, fourcc, readU32, readU64, u32, type ByteReader } from "./byte-utils";

export type Mp4TopLevelBox = { type: string; offset: number; size: number };

/** Lists top-level boxes. Stops at the first `moof` (fragmented files can have thousands). */
export async function listTopLevelBoxes(read: ByteReader, fileSize: number) {
  const boxes: Mp4TopLevelBox[] = [];
  let offset = 0;
  for (let guard = 0; offset + 8 <= fileSize && guard < 4096; guard += 1) {
    const head = await read(offset, Math.min(fileSize, offset + 16));
    if (head.byteLength < 8) break;
    let size = readU32(head, 0);
    const type = ascii(head, 4, 4);
    if (size === 1) {
      if (head.byteLength < 16) break;
      size = readU64(head, 8);
    } else if (size === 0) {
      size = fileSize - offset;
    }
    if (size < 8 || !/^[\x20-\x7e]{4}$/.test(type)) break;
    boxes.push({ type, offset, size });
    if (type === "moof") break;
    offset += size;
  }
  return boxes;
}

type ChildBox = { type: string; boxStart: number; start: number; end: number };

function childBoxes(bytes: Uint8Array, start: number, end: number) {
  const boxes: ChildBox[] = [];
  let offset = start;
  while (offset + 8 <= end) {
    let size = readU32(bytes, offset);
    const type = ascii(bytes, offset + 4, 4);
    let header = 8;
    if (size === 1) {
      size = readU64(bytes, offset + 8);
      header = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < header || offset + size > end) break;
    boxes.push({ type, boxStart: offset, start: offset + header, end: offset + size });
    offset += size;
  }
  return boxes;
}

function child(bytes: Uint8Array, parent: { start: number; end: number }, type: string) {
  return childBoxes(bytes, parent.start, parent.end).find((box) => box.type === type);
}

export type Mp4AudioTrack = {
  timescale: number;
  stsd: Uint8Array;
  hdlr: Uint8Array;
  offsets: Float64Array;
  sizes: Uint32Array;
  durations: Uint32Array;
};

/** Parses the first audio track's sample table from a `moov` box (bytes of the whole box). */
export function parseMp4AudioTrack(moov: Uint8Array): Mp4AudioTrack | null {
  const root = { start: 8, end: moov.byteLength };
  for (const trak of childBoxes(moov, root.start, root.end).filter((box) => box.type === "trak")) {
    const mdia = child(moov, trak, "mdia");
    const hdlr = mdia && child(moov, mdia, "hdlr");
    if (!mdia || !hdlr || ascii(moov, hdlr.start + 8, 4) !== "soun") continue;
    const mdhd = child(moov, mdia, "mdhd");
    const stbl = (() => {
      const minf = child(moov, mdia, "minf");
      return minf && child(moov, minf, "stbl");
    })();
    if (!mdhd || !stbl) continue;
    const timescale = moov[mdhd.start] === 1 ? readU32(moov, mdhd.start + 20) : readU32(moov, mdhd.start + 12);
    const stsd = child(moov, stbl, "stsd");
    const stts = child(moov, stbl, "stts");
    const stsc = child(moov, stbl, "stsc");
    const stsz = child(moov, stbl, "stsz");
    const stco = child(moov, stbl, "stco") ?? child(moov, stbl, "co64");
    if (!stsd || !stts || !stsc || !stsz || !stco || !timescale) continue;

    const sampleCount = readU32(moov, stsz.start + 8);
    const fixedSize = readU32(moov, stsz.start + 4);
    const sizes = new Uint32Array(sampleCount);
    for (let i = 0; i < sampleCount; i += 1) sizes[i] = fixedSize || readU32(moov, stsz.start + 12 + i * 4);

    const durations = new Uint32Array(sampleCount);
    let sample = 0;
    const sttsCount = readU32(moov, stts.start + 4);
    for (let e = 0; e < sttsCount && sample < sampleCount; e += 1) {
      const count = readU32(moov, stts.start + 8 + e * 8);
      const delta = readU32(moov, stts.start + 12 + e * 8);
      for (let k = 0; k < count && sample < sampleCount; k += 1) durations[sample++] = delta;
    }

    const is64 = stco.type === "co64";
    const chunkCount = readU32(moov, stco.start + 4);
    const chunkOffset = (chunk: number) => (is64 ? readU64(moov, stco.start + 8 + chunk * 8) : readU32(moov, stco.start + 8 + chunk * 4));
    const stscCount = readU32(moov, stsc.start + 4);
    const offsets = new Float64Array(sampleCount);
    sample = 0;
    for (let e = 0; e < stscCount; e += 1) {
      const firstChunk = readU32(moov, stsc.start + 8 + e * 12) - 1;
      const perChunk = readU32(moov, stsc.start + 12 + e * 12);
      const lastChunk = e + 1 < stscCount ? readU32(moov, stsc.start + 8 + (e + 1) * 12) - 1 : chunkCount;
      for (let chunk = firstChunk; chunk < lastChunk && sample < sampleCount; chunk += 1) {
        let offset = chunkOffset(chunk);
        for (let k = 0; k < perChunk && sample < sampleCount; k += 1) {
          offsets[sample] = offset;
          offset += sizes[sample]!;
          sample += 1;
        }
      }
    }
    if (sample !== sampleCount) return null;

    return {
      timescale,
      stsd: moov.slice(stsd.boxStart, stsd.end),
      hdlr: moov.slice(hdlr.boxStart, hdlr.end),
      offsets,
      sizes,
      durations,
    };
  }
  return null;
}

function box(type: string, ...payload: Uint8Array[]) {
  const body = concatBytes(payload);
  return concatBytes([u32(body.byteLength + 8), fourcc(type), body]);
}

function fullBox(type: string, version: number, flags: number, ...payload: Uint8Array[]) {
  return box(type, Uint8Array.of(version, (flags >> 16) & 0xff, (flags >> 8) & 0xff, flags & 0xff), ...payload);
}

const MATRIX = [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000];

function words(values: number[]) {
  return concatBytes(values.map((value) => u32(value)));
}

/** Builds a standalone, playable M4A containing samples [first, last) of the track. */
export function buildMp4Segment(track: Mp4AudioTrack, first: number, last: number, sampleData: Uint8Array) {
  const count = last - first;
  let duration = 0;
  const sttsEntries: number[] = [];
  for (let i = first; i < last; i += 1) {
    const delta = track.durations[i]!;
    duration += delta;
    const lastIndex = sttsEntries.length - 2;
    if (lastIndex >= 0 && sttsEntries[lastIndex + 1] === delta) sttsEntries[lastIndex] = sttsEntries[lastIndex]! + 1;
    else sttsEntries.push(1, delta);
  }

  const ftyp = box("ftyp", fourcc("M4A "), u32(0), fourcc("M4A "), fourcc("mp42"), fourcc("isom"));
  const mvhd = fullBox("mvhd", 0, 0, words([0, 0, track.timescale, duration, 0x00010000]), Uint8Array.of(0x01, 0, 0, 0), new Uint8Array(8), words(MATRIX), new Uint8Array(24), u32(2));
  const tkhd = fullBox("tkhd", 0, 7, words([0, 0, 1, 0, duration]), new Uint8Array(8), Uint8Array.of(0, 0, 0, 0, 0x01, 0, 0, 0), words(MATRIX), words([0, 0]));
  const mdhd = fullBox("mdhd", 0, 0, words([0, 0, track.timescale, duration]), Uint8Array.of(0x55, 0xc4, 0, 0));
  const smhd = fullBox("smhd", 0, 0, new Uint8Array(4));
  const dinf = box("dinf", fullBox("dref", 0, 0, u32(1), fullBox("url ", 0, 1)));
  const stts = fullBox("stts", 0, 0, u32(sttsEntries.length / 2), words(sttsEntries));
  const stsc = fullBox("stsc", 0, 0, words([1, 1, count, 1]));
  const stsz = fullBox("stsz", 0, 0, u32(0), u32(count), words(Array.from(track.sizes.subarray(first, last))));

  const buildMoov = (mdatOffset: number) => {
    const stco = fullBox("stco", 0, 0, words([1, mdatOffset]));
    const stbl = box("stbl", track.stsd, stts, stsc, stsz, stco);
    const minf = box("minf", smhd, dinf, stbl);
    const mdia = box("mdia", mdhd, track.hdlr, minf);
    return box("moov", mvhd, box("trak", tkhd, mdia));
  };

  const provisional = buildMoov(0);
  const moov = buildMoov(ftyp.byteLength + provisional.byteLength + 8);
  return concatBytes([ftyp, moov, u32(sampleData.byteLength + 8), fourcc("mdat"), sampleData]);
}
