import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import { env } from "@/shared/lib/env";
import { demoEntries } from "@/shared/lib/demo-data";
import { SupabaseLifeEntryRepository } from "../infrastructure/supabase-life-entry-repository";

export async function listLifeEntriesForUser(userId: string) {
  if (env.demoMode) return demoEntries.filter((entry) => entry.userId === userId);
  const supabase = await createSupabaseServerClient();
  return new SupabaseLifeEntryRepository(supabase).listByUser(userId);
}

export async function getLifeEntryForUser(userId: string, entryId: string) {
  if (env.demoMode) return demoEntries.find((entry) => entry.userId === userId && entry.id === entryId) ?? null;
  const supabase = await createSupabaseServerClient();
  return new SupabaseLifeEntryRepository(supabase).findById(userId, entryId);
}
