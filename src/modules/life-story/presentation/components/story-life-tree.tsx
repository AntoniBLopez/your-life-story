"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef } from "react";
import { Background, Controls, MiniMap, ReactFlow, ReactFlowProvider, useReactFlow, type Edge, type Node, type NodeProps } from "@xyflow/react";
import { buildLifeEntryGraph } from "@/modules/life-story/domain/life-entry-graph";
import { entryToneEdge, momentFlagLabel, type LifeEntry, type LifeEntryLink } from "@/modules/life-story/domain/life-entry";
import { formatStoryDate, titleCase } from "@/shared/lib/utils";
import { flowCanvasColors, useThemeColors } from "@/shared/presentation/theme/use-theme-colors";

function LifeEntryNode({ data }: NodeProps) {
  const nodeData = data as { label: ReactNode };
  return <div className="life-entry-node">{nodeData.label}</div>;
}

const lifeEntryNodeTypes = { lifeEntry: LifeEntryNode };

function LifeTreeViewport({ nodeCount }: { nodeCount: number }) {
  const { fitView } = useReactFlow();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (fittedRef.current || nodeCount === 0) return;
    fittedRef.current = true;
    requestAnimationFrame(() => {
      void fitView({ padding: 0.2, duration: 0 });
    });
  }, [fitView, nodeCount]);

  return null;
}

function StoryLifeTreeInner({
  entries,
  links,
  locale,
  readOnly = false,
}: {
  entries: LifeEntry[];
  links: LifeEntryLink[];
  locale: "es" | "en";
  readOnly?: boolean;
}) {
  const graph = useMemo(() => buildLifeEntryGraph(entries, links), [entries, links]);
  const colors = useThemeColors(flowCanvasColors);

  const nodes: Node[] = graph.nodes.map((node) => ({
    id: node.id,
    type: "lifeEntry",
    position: { x: node.x, y: node.y },
    style: {
      width: 220,
      borderColor: entryToneEdge(node.entry.changeDirection),
    },
    data: {
      label: (
        readOnly ? (
          <div className="block p-3 text-left">
            <span className="text-xs font-bold text-[var(--muted)]">{formatStoryDate(node.entry.startDate, node.entry.datePrecision, locale)}</span>
            <strong className="display mt-1 block text-base leading-tight">{node.entry.title}</strong>
            <span className="mt-1 block text-xs text-[var(--moss)]">{titleCase(node.entry.lifeArea)}</span>
            {node.entry.momentFlags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {node.entry.momentFlags.map((flag) => (
                  <span key={flag} className="rounded-full bg-[var(--tint-peach)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--ink-warm)]">
                    {momentFlagLabel(flag, locale)}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Link href={`/${locale}/app/entries/${node.entry.id}/edit`} className="block p-3 text-left">
            <span className="text-xs font-bold text-[var(--muted)]">{formatStoryDate(node.entry.startDate, node.entry.datePrecision, locale)}</span>
            <strong className="display mt-1 block text-base leading-tight">{node.entry.title}</strong>
            <span className="mt-1 block text-xs text-[var(--moss)]">{titleCase(node.entry.lifeArea)}</span>
            {node.entry.momentFlags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {node.entry.momentFlags.map((flag) => (
                  <span key={flag} className="rounded-full bg-[var(--tint-peach)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--ink-warm)]">
                    {momentFlagLabel(flag, locale)}
                  </span>
                ))}
              </div>
            )}
          </Link>
        )
      ),
    },
  }));

  const edges: Edge[] = graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    animated: edge.relation === "consequence",
    style: {
      stroke: edge.relation === "consequence" ? "var(--tone-improved)" : "var(--edge-related)",
      strokeWidth: edge.relation === "consequence" ? 2 : 1.5,
      strokeDasharray: edge.relation === "related" ? "6 4" : undefined,
    },
    label: edge.relation === "consequence"
      ? (locale === "es" ? "consecuencia" : "consequence")
      : (locale === "es" ? "relacionada" : "related"),
    labelStyle: { fill: "var(--ink-edge)", fontSize: 10 },
  }));

  const help = locale === "es"
    ? "Las líneas sólidas marcan consecuencias; las discontinuas, experiencias relacionadas."
    : "Solid lines mark consequences; dashed lines mark related experiences.";

  return (
    <section className="card mt-8 w-full overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-3">
        <p className="text-xs font-semibold text-[var(--muted)]">{help}</p>
        <span className="pill">{entries.length} {locale === "es" ? "momentos" : "moments"}</span>
      </div>
      <div className="relative h-[clamp(420px,62vh,680px)] w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={lifeEntryNodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          minZoom={0.25}
          maxZoom={1.4}
          proOptions={{ hideAttribution: true }}
        >
          <LifeTreeViewport nodeCount={nodes.length} />
          <Background gap={18} size={1} color={colors.dot} />
          <Controls />
          <MiniMap
            zoomable
            pannable
            nodeColor={colors.minimapNode}
            nodeStrokeColor={colors.minimapNodeStroke}
            nodeBorderRadius={8}
            nodeStrokeWidth={1.5}
            maskColor={colors.minimapMask}
            maskStrokeColor={colors.minimapStroke}
            maskStrokeWidth={1.25}
            bgColor={colors.minimapBg}
          />
        </ReactFlow>
      </div>
    </section>
  );
}

export function StoryLifeTree({
  entries,
  links,
  locale,
  readOnly = false,
}: {
  entries: LifeEntry[];
  links: LifeEntryLink[];
  locale: "es" | "en";
  readOnly?: boolean;
}) {
  return (
    <ReactFlowProvider>
      <StoryLifeTreeInner entries={entries} links={links} locale={locale} readOnly={readOnly} />
    </ReactFlowProvider>
  );
}
