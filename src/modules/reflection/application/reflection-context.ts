import type { LifeEntry } from "@/modules/life-story/domain/life-entry";
import { textOriginBadgeLabel } from "@/modules/life-story/domain/life-entry-text-origin";
import type { LifeEntryProseField } from "@/modules/life-story/domain/life-entry-text-origin";

const MAX_EVENT_BODY = 700;

function provenanceSuffix(entry: LifeEntry, field: LifeEntryProseField, locale: "es" | "en") {
  const origin = entry.textOrigins?.[field] ?? null;
  const containsAi = entry.textContainsAi?.[field] === true;
  const label = textOriginBadgeLabel(origin, containsAi, locale);
  return label ? ` [${label}]` : "";
}

export function buildReflectionContext(entries: LifeEntry[], locale: "es" | "en", options?: { includeTextProvenance?: boolean }) {
  const heading = locale === "es" ? "HISTORIA PERSONAL (cronológica)" : "PERSONAL HISTORY (chronological)";
  const empty = locale === "es" ? "Aún no hay experiencias registradas." : "No experiences have been recorded yet.";
  const annotate = options?.includeTextProvenance === true;
  const lines = entries.map((entry) => {
    const titleTag = annotate ? provenanceSuffix(entry, "title", locale) : "";
    const notes = [
      entry.narrative && `${entry.narrative}${annotate ? provenanceSuffix(entry, "narrative", locale) : ""}`,
      entry.momentFlags.length ? `${locale === "es" ? "Momentos" : "Moments"}: ${entry.momentFlags.join(", ")}` : null,
      entry.difficulty && `${locale === "es" ? "Dificultad" : "Difficulty"}${annotate ? provenanceSuffix(entry, "difficulty", locale) : ""}: ${entry.difficulty}`,
      entry.learning && `${locale === "es" ? "Aprendizaje" : "Learning"}${annotate ? provenanceSuffix(entry, "learning", locale) : ""}: ${entry.learning}`,
      entry.transformation && `${locale === "es" ? "Transformación" : "Transformation"}${annotate ? provenanceSuffix(entry, "transformation", locale) : ""}: ${entry.transformation}`,
    ].filter(Boolean).join("\n");
    return `- ${entry.startDate}${entry.endDate ? ` → ${entry.endDate}` : ""} | ${entry.title}${titleTag} | ${(entry.lifeAreas ?? [entry.lifeArea]).join(", ")} | ${entry.changeDirection}${entry.tags.length ? ` | #${entry.tags.join(" #")}` : ""}\n${notes.slice(0, MAX_EVENT_BODY)}`;
  });
  return `${heading}\n${lines.length ? lines.join("\n\n") : empty}\n\n${locale === "es" ? "No se incluyen archivos adjuntos." : "Attachments are not included."}`;
}
