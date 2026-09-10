import type { LifeEntry, LifeEntryLink } from "./life-entry";

export type LifeEntryThread = {
  id: string;
  entries: LifeEntry[];
  links: LifeEntryLink[];
};

function findRoot(parent: Map<string, string>, id: string): string {
  if (!parent.has(id)) parent.set(id, id);
  const current = parent.get(id)!;
  if (current !== id) parent.set(id, findRoot(parent, current));
  return parent.get(id)!;
}

function union(parent: Map<string, string>, left: string, right: string) {
  const rootLeft = findRoot(parent, left);
  const rootRight = findRoot(parent, right);
  if (rootLeft !== rootRight) parent.set(rootLeft, rootRight);
}

export function turningPointEntries(entries: LifeEntry[]) {
  return [...entries]
    .filter((entry) => entry.momentFlags.length > 0)
    .sort((left, right) => left.startDate.localeCompare(right.startDate) || left.title.localeCompare(right.title));
}

export function learningEntries(entries: LifeEntry[]) {
  return [...entries]
    .filter((entry) => Boolean(entry.learning?.trim()))
    .sort((left, right) => left.startDate.localeCompare(right.startDate) || left.title.localeCompare(right.title));
}

export function buildLifeEntryThreads(entries: LifeEntry[], links: LifeEntryLink[]): LifeEntryThread[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const visibleLinks = links.filter((link) => byId.has(link.sourceEntryId) && byId.has(link.targetEntryId));
  if (visibleLinks.length === 0) return [];

  const parent = new Map<string, string>();
  for (const link of visibleLinks) union(parent, link.sourceEntryId, link.targetEntryId);

  const grouped = new Map<string, string[]>();
  for (const link of visibleLinks) {
    for (const id of [link.sourceEntryId, link.targetEntryId]) {
      const root = findRoot(parent, id);
      const ids = grouped.get(root) ?? [];
      if (!ids.includes(id)) ids.push(id);
      grouped.set(root, ids);
    }
  }

  return [...grouped.values()]
    .filter((ids) => ids.length >= 2)
    .map((ids) => {
      const threadEntries = ids
        .map((id) => byId.get(id))
        .filter((entry): entry is LifeEntry => Boolean(entry))
        .sort((left, right) => left.startDate.localeCompare(right.startDate) || left.title.localeCompare(right.title));
      return {
        id: threadEntries.map((entry) => entry.id).join("-"),
        entries: threadEntries,
        links: visibleLinks.filter((link) => ids.includes(link.sourceEntryId) && ids.includes(link.targetEntryId)),
      };
    })
    .sort((left, right) => left.entries[0].startDate.localeCompare(right.entries[0].startDate));
}

export function linkBetween(links: LifeEntryLink[], fromId: string, toId: string) {
  return links.find((link) =>
    (link.sourceEntryId === fromId && link.targetEntryId === toId)
    || (link.sourceEntryId === toId && link.targetEntryId === fromId),
  );
}
