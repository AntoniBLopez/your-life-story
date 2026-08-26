import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatStoryDate(
  date: string,
  precision: "day" | "month" | "year",
  locale: "es" | "en" = "es",
) {
  const [year, month, day] = date.split("-").map(Number);
  if (precision === "year") return String(year);
  const value = new Date(Date.UTC(year, month - 1, day || 1));
  return new Intl.DateTimeFormat(locale, {
    month: precision === "month" ? "long" : "short",
    year: "numeric",
    ...(precision === "day" ? { day: "numeric" } : {}),
  }).format(value);
}

export function titleCase(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
