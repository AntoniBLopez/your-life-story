export type ByteRange = {
  start: number;
  end: number;
};

export function parseByteRange(rangeHeader: string | null, size: number): ByteRange | null {
  if (!rangeHeader || size <= 0) return null;

  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match) return null;

  const [, startPart, endPart] = match;
  let start: number;
  let end: number;

  if (startPart === "" && endPart !== "") {
    const suffixLength = Number(endPart);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else if (startPart !== "" && endPart === "") {
    start = Number(startPart);
    if (!Number.isFinite(start) || start < 0) return null;
    end = size - 1;
  } else if (startPart !== "" && endPart !== "") {
    start = Number(startPart);
    end = Number(endPart);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start) return null;
  } else {
    return null;
  }

  if (start >= size) return null;
  end = Math.min(end, size - 1);
  if (end < start) return null;

  return { start, end };
}
