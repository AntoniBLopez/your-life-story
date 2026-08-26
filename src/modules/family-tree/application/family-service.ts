import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import { env } from "@/shared/lib/env";
import { demoPeople, demoRelationships } from "@/shared/lib/demo-data";
import { SupabaseFamilyRepository } from "../infrastructure/supabase-family-repository";

export async function getFamilyGraph(userId: string) {
  if (env.demoMode) return { people: demoPeople.filter((person) => person.userId === userId), relationships: demoRelationships.filter((relationship) => relationship.userId === userId) };
  const repository = new SupabaseFamilyRepository(await createSupabaseServerClient());
  const [people, relationships] = await Promise.all([repository.listPeople(userId), repository.listRelationships(userId)]);
  return { people, relationships };
}
