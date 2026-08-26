import type { LifeEntry, LifeEntryLink } from "./life-entry";

const DAY_MS = 86_400_000;
const NODE_WIDTH = 220;
const NODE_HEIGHT = 96;
const H_GAP = 48;
const V_GAP = 72;

function dateToY(date: string) {
  return new Date(`${date}T00:00:00`).getTime();
}

export type LifeGraphNode = {
  id: string;
  x: number;
  y: number;
  entry: LifeEntry;
};

export type LifeGraphEdge = {
  id: string;
  source: string;
  target: string;
  relation: LifeEntryLink["relation"];
};

export function buildLifeEntryGraph(entries: LifeEntry[], links: LifeEntryLink[]) {
  if (entries.length === 0) return { nodes: [] as LifeGraphNode[], edges: [] as LifeGraphEdge[] };

  const entryIds = new Set(entries.map((entry) => entry.id));
  const visibleLinks = links.filter(
    (link) => entryIds.has(link.sourceEntryId) && entryIds.has(link.targetEntryId),
  );

  const sorted = [...entries].sort((a, b) => dateToY(a.startDate) - dateToY(b.startDate) || a.title.localeCompare(b.title));
  const minDate = dateToY(sorted[0].startDate);
  const yByEntry = new Map<string, number>();
  const columnByEntry = new Map<string, number>();

  for (const entry of sorted) {
    yByEntry.set(entry.id, Math.round((dateToY(entry.startDate) - minDate) / DAY_MS) * (NODE_HEIGHT + V_GAP));
  }

  const consequenceChildren = new Map<string, string[]>();
  const consequenceParents = new Map<string, string>();
  for (const link of visibleLinks) {
    if (link.relation !== "consequence") continue;
    consequenceChildren.set(link.sourceEntryId, [...(consequenceChildren.get(link.sourceEntryId) ?? []), link.targetEntryId]);
    consequenceParents.set(link.targetEntryId, link.sourceEntryId);
  }

  const roots = sorted.filter((entry) => !consequenceParents.has(entry.id));
  let nextColumn = 0;

  function assignColumn(entryId: string, column: number) {
    if (columnByEntry.has(entryId)) return;
    columnByEntry.set(entryId, column);
    for (const childId of consequenceChildren.get(entryId) ?? []) assignColumn(childId, column);
  }

  for (const root of roots) {
    assignColumn(root.id, nextColumn);
    nextColumn += 1;
  }

  for (const entry of sorted) {
    if (!columnByEntry.has(entry.id)) {
      columnByEntry.set(entry.id, nextColumn);
      nextColumn += 1;
    }
  }

  const nodes: LifeGraphNode[] = sorted.map((entry) => ({
    id: entry.id,
    x: (columnByEntry.get(entry.id) ?? 0) * (NODE_WIDTH + H_GAP),
    y: yByEntry.get(entry.id) ?? 0,
    entry,
  }));

  const edges: LifeGraphEdge[] = visibleLinks.map((link) => ({
    id: link.id,
    source: link.sourceEntryId,
    target: link.targetEntryId,
    relation: link.relation,
  }));

  return { nodes, edges, width: nextColumn * (NODE_WIDTH + H_GAP) + NODE_WIDTH, height: Math.max(...nodes.map((node) => node.y)) + NODE_HEIGHT + V_GAP };
}
