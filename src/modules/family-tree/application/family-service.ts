import { env } from "@/shared/lib/env";
import { demoPeople, demoRelationships } from "@/shared/lib/demo-data";
import { MongoFamilyRepository } from "../infrastructure/mongo-family-repository";

const repository = new MongoFamilyRepository();

export async function getFamilyGraph(userId: string) {
  if (env.demoMode) {
    return { people: demoPeople.filter((person) => person.userId === userId), relationships: demoRelationships.filter((relation) => relation.userId === userId) };
  }
  const [people, relationships] = await Promise.all([repository.listPeople(userId), repository.listRelationships(userId)]);
  return { people, relationships };
}
