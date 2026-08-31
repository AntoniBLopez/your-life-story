"use client";

import { useEffect, useRef, useCallback } from "react";
import { Background, Controls, MiniMap, ReactFlow, ReactFlowProvider, useReactFlow, type Edge, type Node, type OnNodeDrag, type OnNodesChange } from "@xyflow/react";
import { saveFamilyNodeLayoutsAction } from "@/modules/family-tree/application/family-actions";
import { FAMILY_LAYOUT } from "@/modules/family-tree/domain/family-layout";
import { familyTreeEdgeTypes, familyTreeNodeTypes } from "@/modules/family-tree/presentation/components/family-tree-flow";

const LAYOUT_SAVE_DELAY_MS = 450;

type Props = {
  nodes: Node[];
  edges: Edge[];
  subjectId?: string;
  onNodesChange: OnNodesChange<Node>;
  onNodeDragStop?: (nodeId: string) => void;
  onNodeClick: (node: Node) => void;
  onPaneClick: () => void;
};

function FamilyTreeInitialViewport({ subjectId, nodes }: { subjectId?: string; nodes: Node[] }) {
  const { setCenter } = useReactFlow();
  const focusedRef = useRef(false);

  useEffect(() => {
    if (focusedRef.current) return;
    const focusId = subjectId ?? nodes[0]?.id;
    if (!focusId) return;
    const node = nodes.find((item) => item.id === focusId);
    if (!node) return;

    focusedRef.current = true;
    const centerX = node.position.x + FAMILY_LAYOUT.nodeWidth / 2;
    const centerY = node.position.y + FAMILY_LAYOUT.nodeFocusHeight / 2;
    setCenter(centerX, centerY, { zoom: FAMILY_LAYOUT.initialZoom, duration: 0 });
  }, [nodes, setCenter, subjectId]);

  return null;
}

function FamilyTreeCanvasInner({
  nodes,
  edges,
  subjectId,
  onNodesChange,
  onNodeDragStop,
  onNodeClick,
  onPaneClick,
}: Props) {
  const pendingLayouts = useRef(new Map<string, { x: number; y: number }>());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flushLayouts = useCallback(() => {
    const positions = [...pendingLayouts.current.entries()].map(([personId, position]) => ({
      personId,
      x: position.x,
      y: position.y,
    }));
    pendingLayouts.current.clear();
    if (positions.length === 0) return;
    void saveFamilyNodeLayoutsAction({ positions });
  }, []);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  function scheduleLayoutSave(personId: string, position: { x: number; y: number }) {
    pendingLayouts.current.set(personId, position);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushLayouts, LAYOUT_SAVE_DELAY_MS);
  }

  const handleNodeDragStop = useCallback<OnNodeDrag<Node>>((_event, node) => {
    onNodeDragStop?.(node.id);
    scheduleLayoutSave(node.id, node.position);
  }, [onNodeDragStop]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={familyTreeNodeTypes}
      edgeTypes={familyTreeEdgeTypes}
      onNodesChange={onNodesChange}
      onNodeDragStop={handleNodeDragStop}
      onPaneClick={onPaneClick}
      onNodeClick={(_, node) => onNodeClick(node)}
      nodesDraggable
      nodesConnectable={false}
      elevateNodesOnSelect
      minZoom={0.2}
      maxZoom={1.6}
      defaultViewport={{ x: 0, y: 0, zoom: FAMILY_LAYOUT.initialZoom }}
    >
      <FamilyTreeInitialViewport subjectId={subjectId} nodes={nodes} />
      <Background gap={18} size={1} color="#dce5db" />
      <Controls />
      <MiniMap zoomable pannable />
    </ReactFlow>
  );
}

export function FamilyTreeCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <FamilyTreeCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
