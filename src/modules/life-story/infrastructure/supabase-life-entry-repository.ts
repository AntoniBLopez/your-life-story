import type { SupabaseClient } from "@supabase/supabase-js";
import type { LifeEntry, LifeEntryLink } from "../domain/life-entry";
import type { LifeEntryInput } from "../application/life-entry-schema";
import type { LifeEntryRepository } from "../application/ports/life-entry-repository";

function mapEntry(row: any): LifeEntry {
  return {
    id: row.id, userId: row.user_id, startDate: row.start_date, endDate: row.end_date,
    datePrecision: row.date_precision, title: row.title, narrative: row.narrative,
    lifeArea: row.life_area, lifeAreas: row.life_areas ?? [row.life_area], changeDirection: row.change_direction, difficulty: row.difficulty,
    learning: row.learning, transformation: row.transformation, tags: row.tags ?? [], createdAt: row.created_at,
  };
}

export class SupabaseLifeEntryRepository implements LifeEntryRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listByUser(userId: string) {
    const { data, error } = await this.supabase.from("life_entries").select("*").eq("user_id", userId).order("start_date", { ascending: true }).order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapEntry);
  }

  async findById(userId: string, entryId: string) {
    const { data, error } = await this.supabase.from("life_entries").select("*").eq("id", entryId).eq("user_id", userId).maybeSingle();
    if (error) throw error;
    return data ? mapEntry(data) : null;
  }

  async create(userId: string, input: LifeEntryInput) {
    const { linkedEntryId: _linkedEntryId, linkType: _linkType, ...entry } = input;
    const { data, error } = await this.supabase.from("life_entries").insert({
      user_id: userId, start_date: entry.startDate, end_date: entry.endDate, date_precision: entry.datePrecision,
      title: entry.title, narrative: entry.narrative, life_area: entry.lifeAreas[0], life_areas: entry.lifeAreas, change_direction: entry.changeDirection,
      difficulty: entry.difficulty, learning: entry.learning, transformation: entry.transformation, tags: entry.tags,
    }).select().single();
    if (error) throw error;
    return mapEntry(data);
  }

  async update(userId: string, entryId: string, input: LifeEntryInput) {
    const { linkedEntryId: _linkedEntryId, linkType: _linkType, ...entry } = input;
    const { data, error } = await this.supabase.from("life_entries").update({
      start_date: entry.startDate, end_date: entry.endDate, date_precision: entry.datePrecision,
      title: entry.title, narrative: entry.narrative, life_area: entry.lifeAreas[0], life_areas: entry.lifeAreas, change_direction: entry.changeDirection,
      difficulty: entry.difficulty, learning: entry.learning, transformation: entry.transformation, tags: entry.tags,
    }).eq("id", entryId).eq("user_id", userId).select().single();
    if (error) throw error;
    return mapEntry(data);
  }

  async delete(userId: string, entryId: string) {
    const { error } = await this.supabase.from("life_entries").delete().eq("id", entryId).eq("user_id", userId);
    if (error) throw error;
  }

  async createLink(userId: string, sourceEntryId: string, targetEntryId: string, relation: LifeEntryLink["relation"]) {
    if (sourceEntryId === targetEntryId) throw new Error("An entry cannot link to itself.");
    const { error } = await this.supabase.from("life_entry_links").insert({ user_id: userId, source_entry_id: sourceEntryId, target_entry_id: targetEntryId, relation });
    if (error) throw error;
  }

  async replaceLink(userId: string, sourceEntryId: string, targetEntryId: string | null, relation: LifeEntryLink["relation"]) {
    const { error: deleteError } = await this.supabase.from("life_entry_links").delete().eq("user_id", userId).eq("source_entry_id", sourceEntryId);
    if (deleteError) throw deleteError;
    if (targetEntryId) await this.createLink(userId, sourceEntryId, targetEntryId, relation);
  }
}
