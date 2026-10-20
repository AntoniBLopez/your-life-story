import en from "../../../../messages/en.json";
import es from "../../../../messages/es.json";

const catalogs = { en: en.reflect, es: es.reflect };

export type ReflectionCopy = { [Key in keyof typeof en.reflect]: string };

export function reflectionCopy(locale: "es" | "en"): ReflectionCopy {
  return catalogs[locale];
}

export function formatReflectionTime(iso: string, locale: "es" | "en") {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(date);
}
