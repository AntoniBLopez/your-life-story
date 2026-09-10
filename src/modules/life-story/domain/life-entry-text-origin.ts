export const LIFE_ENTRY_PROSE_FIELDS = [
  "title",
  "narrative",
  "difficulty",
  "learning",
  "transformation",
] as const;

export const HUMAN_TEXT_ORIGINS = ["written", "spoken", "mixed"] as const;

export type LifeEntryProseField = (typeof LIFE_ENTRY_PROSE_FIELDS)[number];
export type HumanTextOrigin = (typeof HUMAN_TEXT_ORIGINS)[number];
export type LifeEntryTextOrigins = Record<LifeEntryProseField, HumanTextOrigin | null>;
export type LifeEntryTextContainsAi = Record<LifeEntryProseField, boolean>;

export type LifeEntryProseValues = Record<LifeEntryProseField, string | null | undefined>;

export type FieldTextProvenance = {
  origin: HumanTextOrigin | null;
  containsAi: boolean;
};

export function emptyTextOrigins(): LifeEntryTextOrigins {
  return {
    title: null,
    narrative: null,
    difficulty: null,
    learning: null,
    transformation: null,
  };
}

export function emptyTextContainsAi(): LifeEntryTextContainsAi {
  return {
    title: false,
    narrative: false,
    difficulty: false,
    learning: false,
    transformation: false,
  };
}

export function defaultTextOriginsFromContent(fields: LifeEntryProseValues): LifeEntryTextOrigins {
  return {
    title: fields.title?.trim() ? "written" : null,
    narrative: fields.narrative?.trim() ? "written" : null,
    difficulty: fields.difficulty?.trim() ? "written" : null,
    learning: fields.learning?.trim() ? "written" : null,
    transformation: fields.transformation?.trim() ? "written" : null,
  };
}

export function defaultLifeEntryProvenance(fields: LifeEntryProseValues): {
  textOrigins: LifeEntryTextOrigins;
  textContainsAi: LifeEntryTextContainsAi;
  aiClassified: boolean;
} {
  return {
    textOrigins: defaultTextOriginsFromContent(fields),
    textContainsAi: emptyTextContainsAi(),
    aiClassified: false,
  };
}

function isHumanTextOrigin(value: unknown): value is HumanTextOrigin {
  return value === "written" || value === "spoken" || value === "mixed";
}

function originFromUnknown(value: unknown): HumanTextOrigin | null | undefined {
  if (value === null) return null;
  if (isHumanTextOrigin(value)) return value;
  return undefined;
}

export function resolveTextOrigins(stored: unknown, fields: LifeEntryProseValues): LifeEntryTextOrigins {
  const fallback = defaultTextOriginsFromContent(fields);
  if (!stored || typeof stored !== "object") return fallback;
  const record = stored as Record<string, unknown>;
  const resolved = emptyTextOrigins();
  for (const field of LIFE_ENTRY_PROSE_FIELDS) {
    const parsed = originFromUnknown(record[field]);
    resolved[field] = parsed === undefined ? fallback[field] : parsed;
  }
  return resolved;
}

export function resolveTextContainsAi(stored: unknown): LifeEntryTextContainsAi {
  const resolved = emptyTextContainsAi();
  if (!stored || typeof stored !== "object") return resolved;
  const record = stored as Record<string, unknown>;
  for (const field of LIFE_ENTRY_PROSE_FIELDS) {
    resolved[field] = record[field] === true;
  }
  return resolved;
}

export function mergeHumanOrigin(current: HumanTextOrigin | null, incoming: "written" | "spoken"): HumanTextOrigin {
  if (current === null) return incoming;
  if (current === incoming) return current;
  return "mixed";
}

export function nextProvenanceAfterTyped(
  origin: HumanTextOrigin | null,
  containsAi: boolean,
  nextText: string,
): FieldTextProvenance {
  if (!nextText.trim()) return { origin: null, containsAi: false };
  return {
    origin: mergeHumanOrigin(origin, "written"),
    containsAi,
  };
}

export function nextProvenanceAfterSpoken(
  origin: HumanTextOrigin | null,
  containsAi: boolean,
  nextText: string,
): FieldTextProvenance {
  if (!nextText.trim()) return { origin: null, containsAi: false };
  return {
    origin: mergeHumanOrigin(origin, "spoken"),
    containsAi,
  };
}

export function nextProvenanceAfterAiReplace(nextText: string): FieldTextProvenance {
  if (!nextText.trim()) return { origin: null, containsAi: false };
  return { origin: null, containsAi: true };
}

export function isOwnVoiceText(origin: HumanTextOrigin | null | undefined, containsAi: boolean | undefined) {
  return Boolean(origin) && containsAi !== true;
}

export function isOwnVoiceField(
  entry: {
    textOrigins?: Partial<LifeEntryTextOrigins> | null;
    textContainsAi?: Partial<LifeEntryTextContainsAi> | null;
  },
  field: LifeEntryProseField,
  text: string | null | undefined,
) {
  const origin = entry.textOrigins?.[field] ?? (text?.trim() ? "written" : null);
  const containsAi = entry.textContainsAi?.[field] ?? false;
  return isOwnVoiceText(origin, containsAi);
}

export function textOriginBadgeLabel(
  origin: HumanTextOrigin | null,
  containsAi: boolean,
  locale: "es" | "en",
): string | null {
  if (!origin && !containsAi) return null;
  const es = locale === "es";
  if (!origin && containsAi) return es ? "Generado con IA" : "Generated with AI";
  if (origin === "written") return containsAi ? (es ? "Escrito y generado" : "Written and generated") : (es ? "Escrito" : "Written");
  if (origin === "spoken") return containsAi ? (es ? "Hablado y generado" : "Spoken and generated") : (es ? "Hablado" : "Spoken");
  return containsAi
    ? (es ? "Mixto y generado" : "Mixed and generated")
    : (es ? "Mixto (escrito y hablado)" : "Mixed (written and spoken)");
}
