import { getFamilyGraph } from "@/modules/family-tree/application/family-service";
import { listLifeEntriesForUser } from "@/modules/life-story/application/life-story-service";

export async function searchUserStory(userId: string, query: string) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return { entries: [], people: [] };
  const [{ entries }, family] = await Promise.all([listLifeEntriesForUser(userId).then((entries) => ({ entries })), getFamilyGraph(userId)]);
  const matches = (values: Array<string | null | undefined>) => values.some((value) => value?.toLocaleLowerCase().includes(needle));
  return {
    entries: entries.filter((entry) => matches([entry.title, entry.narrative, entry.difficulty, entry.learning, entry.transformation, entry.lifeArea, ...(entry.lifeAreas ?? []), ...(entry.momentFlags ?? []), entry.startDate, entry.endDate, ...entry.tags])),
    people: family.people.filter((person) => matches([person.fullName, person.birthDate, person.deathDate, person.birthCity, person.birthCountry])),
  };
}