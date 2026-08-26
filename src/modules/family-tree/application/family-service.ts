import { MongoFamilyRepository } from "../infrastructure/mongo-family-repository";

const repository = new MongoFamilyRepository();

export async function getFamilyGraph(userId: string) {
  const [people, relationships] = await Promise.all([repository.listPeople(userId), repository.listRelationships(userId)]);
  return { people, relationships };
}
