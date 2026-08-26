import type { SupabaseClient } from "@supabase/supabase-js";
import type { FamilyPerson, FamilyRelationship } from "../domain/family-graph";
import type { FamilyRepository } from "../application/ports/family-repository";

const mapPerson = (row: any): FamilyPerson => ({ id: row.id, userId: row.user_id, fullName: row.full_name, birthDate: row.birth_date, birthDatePrecision: row.birth_date_precision, deathDate: row.death_date, deathDatePrecision: row.death_date_precision, birthCountry: row.birth_country, birthCity: row.birth_city, isSubject: row.is_subject });
const mapRelationship = (row: any): FamilyRelationship => ({ id: row.id, userId: row.user_id, sourcePersonId: row.source_person_id, targetPersonId: row.target_person_id, relationshipType: row.relationship_type });

export class SupabaseFamilyRepository implements FamilyRepository {
  constructor(private readonly supabase: SupabaseClient) {}
  async listPeople(userId: string) { const { data, error } = await this.supabase.from("family_people").select("*").eq("user_id", userId).order("full_name"); if (error) throw error; return (data ?? []).map(mapPerson); }
  async listRelationships(userId: string) { const { data, error } = await this.supabase.from("family_relationships").select("*").eq("user_id", userId); if (error) throw error; return (data ?? []).map(mapRelationship); }
  async addPerson(userId: string, person: Omit<FamilyPerson, "id" | "userId">) {
    if (person.isSubject) { const { error } = await this.supabase.from("family_people").update({ is_subject: false }).eq("user_id", userId); if (error) throw error; }
    const { data, error } = await this.supabase.from("family_people").insert({ user_id: userId, full_name: person.fullName, birth_date: person.birthDate, birth_date_precision: person.birthDatePrecision, death_date: person.deathDate, death_date_precision: person.deathDatePrecision, birth_country: person.birthCountry, birth_city: person.birthCity, is_subject: person.isSubject }).select().single();
    if (error) throw error; return mapPerson(data);
  }
  async updatePerson(userId: string, personId: string, person: Omit<FamilyPerson, "id" | "userId">) {
    if (person.isSubject) { const { error } = await this.supabase.from("family_people").update({ is_subject: false }).eq("user_id", userId); if (error) throw error; }
    const { data, error } = await this.supabase.from("family_people").update({ full_name: person.fullName, birth_date: person.birthDate, birth_date_precision: person.birthDatePrecision, death_date: person.deathDate, death_date_precision: person.deathDatePrecision, birth_country: person.birthCountry, birth_city: person.birthCity, is_subject: person.isSubject }).eq("id", personId).eq("user_id", userId).select().single();
    if (error) throw error; return mapPerson(data);
  }
  async addRelationship(userId: string, relationship: Omit<FamilyRelationship, "id" | "userId">) {
    const { error } = await this.supabase.from("family_relationships").insert({ user_id: userId, source_person_id: relationship.sourcePersonId, target_person_id: relationship.targetPersonId, relationship_type: relationship.relationshipType });
    if (error) throw error;
  }
}
