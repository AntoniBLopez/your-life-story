/** Reads bytes [start, end) of a stored file. Implementations clamp `end` to the file size. */
export type ByteReader = (start: number, end: number) => Promise<Uint8Array>;

export function readU32(bytes: Uint8Array, offset: number) {
  return ((bytes[offset]! << 24) >>> 0) + (bytes[offset + 1]! << 16) + (bytes[offset + 2]! << 8) + bytes[offset + 3]!;
}

export function readU64(bytes: Uint8Array, offset: number) {
  return readU32(bytes, offset) * 2 ** 32 + readU32(bytes, offset + 4);
}

export function readU32LE(bytes: Uint8Array, offset: number) {
  return bytes[offset]! + (bytes[offset + 1]! << 8) + (bytes[offset + 2]! << 16) + ((bytes[offset + 3]! << 24) >>> 0);
}

export function readU16LE(bytes: Uint8Array, offset: number) {
  return bytes[offset]! + (bytes[offset + 1]! << 8);
}

export function ascii(bytes: Uint8Array, offset: number, length: number) {
  let value = "";
  for (let i = 0; i < length; i += 1) value += String.fromCharCode(bytes[offset + i] ?? 0);
  return value;
}

export function concatBytes(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

export function u32(value: number) {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value >>> 0);
  return out;
}

export function u32le(value: number) {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value >>> 0, true);
  return out;
}

export function fourcc(value: string) {
  return Uint8Array.from(value, (char) => char.charCodeAt(0));
}
