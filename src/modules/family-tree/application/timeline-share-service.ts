import { findUserById } from "@/modules/identity/infrastructure/mongo-user-repository";
import { getProfile } from "@/modules/identity/infrastructure/mongo-profile-repository";
import { listLifeEntriesForUser, listLifeEntryLinksForUser } from "@/modules/life-story/application/life-story-service";
import { grantsTimelineAccess, normalizePersonEmail, relationToSubject, type FamilyPerson, type FamilyRelationship } from "../domain/family-graph";
import { getFamilyGraph } from "./family-service";
import { MongoFamilyRepository } from "../infrastructure/mongo-family-repository";

const repository = new MongoFamilyRepository();

export type SharedTimelineInvite = {
  ownerUserId: string;
  ownerDisplayName: string;
  personName: string;
  relationLabel: string;
  entryCount: number;
};

export type SharedTimeline = {
  ownerUserId: string;
  ownerDisplayName: string;
  personId: string;
  personName: string;
  relationLabel: string;
  people: FamilyPerson[];
  relationships: FamilyRelationship[];
  entries: Awaited<ReturnType<typeof listLifeEntriesForUser>>;
  links: Awaited<ReturnType<typeof listLifeEntryLinksForUser>>;
};

async function matchingInvite(ownerUserId: string, viewerEmail: string, viewerUserId: string) {
  if (ownerUserId === viewerUserId) return null;
  const email = normalizePersonEmail(viewerEmail);
  if (!email) return null;
  const { people, relationships } = await getFamilyGraph(ownerUserId);
  const person = people.find((item) => grantsTimelineAccess(item) && normalizePersonEmail(item.email) === email);
  if (!person) return null;
  return { people, relationships, person };
}

export async function findSharedInvite(ownerUserId: string, viewer: { id: string; email: string }) {
  return matchingInvite(ownerUserId, viewer.email, viewer.id);
}

export async function listSharedTimelinesForViewer(viewer: { id: string; email: string }, locale: "es" | "en") {
  const email = normalizePersonEmail(viewer.email);
  if (!email) return [];
  const invited = await repository.listPeopleByInviteEmail(email);
  const byOwner = new Map<string, (typeof invited)[number]>();
  for (const person of invited) {
    if (person.userId === viewer.id || !grantsTimelineAccess(person)) continue;
    if (!byOwner.has(person.userId)) byOwner.set(person.userId, person);
  }

  const shares: SharedTimelineInvite[] = [];
  for (const [ownerUserId, person] of byOwner) {
    const [owner, profile, graph, entries] = await Promise.all([
      findUserById(ownerUserId),
      getProfile(ownerUserId),
      getFamilyGraph(ownerUserId),
      listLifeEntriesForUser(ownerUserId),
    ]);
    const subject = graph.people.find((item) => item.isSubject);
    shares.push({
      ownerUserId,
      ownerDisplayName: profile?.displayName || owner?.displayName || (locale === "es" ? "Alguien de tu familia" : "Someone in your family"),
      personName: person.fullName,
      relationLabel: relationToSubject(person.id, subject?.id, graph.relationships, graph.people, locale),
      entryCount: entries.length,
    });
  }
  return shares;
}

export async function getSharedTimelineForViewer(ownerUserId: string, viewer: { id: string; email: string }, locale: "es" | "en"): Promise<SharedTimeline | null> {
  const match = await matchingInvite(ownerUserId, viewer.email, viewer.id);
  if (!match) return null;
  const [owner, profile, entries, links] = await Promise.all([
    findUserById(ownerUserId),
    getProfile(ownerUserId),
    listLifeEntriesForUser(ownerUserId),
    listLifeEntryLinksForUser(ownerUserId),
  ]);
  const subject = match.people.find((item) => item.isSubject);
  return {
    ownerUserId,
    ownerDisplayName: profile?.displayName || owner?.displayName || (locale === "es" ? "Alguien de tu familia" : "Someone in your family"),
    personId: match.person.id,
    personName: match.person.fullName,
    relationLabel: relationToSubject(match.person.id, subject?.id, match.relationships, match.people, locale),
    people: match.people,
    relationships: match.relationships,
    entries,
    links,
  };
}
