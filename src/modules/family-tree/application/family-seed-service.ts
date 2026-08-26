import { BASSOLS_FAMILY_SEED } from "../domain/bassols-family-seed";
import { MongoFamilyRepository } from "../infrastructure/mongo-family-repository";

const repository = new MongoFamilyRepository();

export async function importBassolsFamilySeed(userId: string) {
  await repository.clearAll(userId);
  const idByKey = new Map<string, string>();

  for (const { key, ...person } of BASSOLS_FAMILY_SEED.people) {
    const created = await repository.addPerson(userId, person);
    idByKey.set(key, created.id);
  }

  for (const relationship of BASSOLS_FAMILY_SEED.relationships) {
    const sourcePersonId = idByKey.get(relationship.sourceKey);
    const targetPersonId = idByKey.get(relationship.targetKey);
    if (!sourcePersonId || !targetPersonId) continue;
    await repository.addRelationship(userId, {
      sourcePersonId,
      targetPersonId,
      relationshipType: relationship.relationshipType,
    });
  }
}
