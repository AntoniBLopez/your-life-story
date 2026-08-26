import type { LifeEntry } from "@/modules/life-story/domain/life-entry";

const MAX_EVENT_BODY = 700;

export function buildReflectionContext(entries: LifeEntry[], locale: "es" | "en") {
  const heading = locale === "es" ? "HISTORIA PERSONAL (cronológica)" : "PERSONAL HISTORY (chronological)";
  const empty = locale === "es" ? "Aún no hay experiencias registradas." : "No experiences have been recorded yet.";
  const lines = entries.map((entry) => {
    const notes = [
      entry.narrative,
      entry.momentFlags.length ? `${locale === "es" ? "Momentos" : "Moments"}: ${entry.momentFlags.join(", ")}` : null,
      entry.difficulty && `${locale === "es" ? "Dificultad" : "Difficulty"}: ${entry.difficulty}`,
      entry.learning && `${locale === "es" ? "Aprendizaje" : "Learning"}: ${entry.learning}`,
      entry.transformation && `${locale === "es" ? "Transformación" : "Transformation"}: ${entry.transformation}`,
    ].filter(Boolean).join("\n");
    return `- ${entry.startDate}${entry.endDate ? ` → ${entry.endDate}` : ""} | ${entry.title} | ${(entry.lifeAreas ?? [entry.lifeArea]).join(", ")} | ${entry.changeDirection}${entry.tags.length ? ` | #${entry.tags.join(" #")}` : ""}\n${notes.slice(0, MAX_EVENT_BODY)}`;
  });
  return `${heading}\n${lines.length ? lines.join("\n\n") : empty}\n\n${locale === "es" ? "No se incluyen archivos adjuntos." : "Attachments are not included."}`;
}
