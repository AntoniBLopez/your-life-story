"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Background, Controls, MiniMap, ReactFlow, ReactFlowProvider, useReactFlow, type Edge, type Node, type OnNodeDrag, type OnNodesChange, type SelectionDragHandler } from "@xyflow/react";
import { Check, LoaderCircle, X } from "lucide-react";
import { saveFamilyNodeLayoutsAction } from "@/modules/family-tree/application/family-actions";
import { FAMILY_LAYOUT } from "@/modules/family-tree/domain/family-layout";
import { FamilyTreeCanvasToolModeControl, type FamilyTreeCanvasToolMode } from "@/modules/family-tree/presentation/components/family-tree-canvas-tool-mode-control";
import { familyTreeEdgeTypes, familyTreeNodeTypes } from "@/modules/family-tree/presentation/components/family-tree-flow";
import { FamilyTreeResetLayoutControl } from "@/modules/family-tree/presentation/components/family-tree-reset-layout-control";

const LAYOUT_SAVE_DELAY_MS = 450;
const SAVED_HIDE_MS = 1400;

type SaveStatus = "idle" | "saving" | "saved" | "error";

type Props = {
  locale: "es" | "en";
  nodes: Node[];
  edges: Edge[];
  subjectId?: string;
  readOnly?: boolean;
  onNodesChange: OnNodesChange<Node>;
  onNodeDragStart?: (nodeId: string) => void;
  onNodeDragStop?: (nodeId: string) => void;
  onSelectionDragStart?: (nodeIds: string[]) => void;
  onSelectionDragStop?: (nodeIds: string[]) => void;
  onLayoutsReset?: () => void;
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
  locale,
  nodes,
  edges,
  subjectId,
  readOnly,
  onNodesChange,
  onNodeDragStart,
  onNodeDragStop,
  onSelectionDragStart,
  onSelectionDragStop,
  onLayoutsReset,
  onNodeClick,
  onPaneClick,
}: Props) {
  const router = useRouter();
  const { setNodes } = useReactFlow();
  const [toolMode, setToolMode] = useState<FamilyTreeCanvasToolMode>("pointer");
  const selectToolActive = !readOnly && toolMode === "select";
  const pendingLayouts = useRef(new Map<string, { x: number; y: number }>());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const savedHideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveGeneration = useRef(0);
  const draggingRef = useRef(false);
  const inFlightRef = useRef(false);
  const onNodeDragStartRef = useRef(onNodeDragStart);
  const onNodeDragStopRef = useRef(onNodeDragStop);
  const onSelectionDragStartRef = useRef(onSelectionDragStart);
  const onSelectionDragStopRef = useRef(onSelectionDragStop);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [, startSaveTransition] = useTransition();
  onNodeDragStartRef.current = onNodeDragStart;
  onNodeDragStopRef.current = onNodeDragStop;
  onSelectionDragStartRef.current = onSelectionDragStart;
  onSelectionDragStopRef.current = onSelectionDragStop;

  const copy = locale === "es"
    ? { saving: "Guardando…", saved: "Guardado", error: "No se pudo guardar" }
    : { saving: "Saving…", saved: "Saved", error: "Could not save" };

  const flushLayouts = useCallback(() => {
    if (draggingRef.current || inFlightRef.current) return;
    const positions = [...pendingLayouts.current.entries()].map(([personId, position]) => ({
      personId,
      x: position.x,
      y: position.y,
    }));
    pendingLayouts.current.clear();
    if (positions.length === 0) return;

    const generation = saveGeneration.current;
    inFlightRef.current = true;
    startSaveTransition(async () => {
      const result = await saveFamilyNodeLayoutsAction({ positions });
      inFlightRef.current = false;
      const interrupted = generation !== saveGeneration.current || draggingRef.current || pendingLayouts.current.size > 0;
      if (interrupted) {
        if (!draggingRef.current && pendingLayouts.current.size > 0) flushLayoutsRef.current();
        return;
      }
      if (!result.ok) {
        setSaveStatus("error");
        savedHideTimer.current = setTimeout(() => setSaveStatus("idle"), SAVED_HIDE_MS);
        return;
      }
      setSaveStatus("saved");
      savedHideTimer.current = setTimeout(() => setSaveStatus("idle"), SAVED_HIDE_MS);
    });
  }, [startSaveTransition]);
  const flushLayoutsRef = useRef(flushLayouts);
  flushLayoutsRef.current = flushLayouts;

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (savedHideTimer.current) clearTimeout(savedHideTimer.current);
    flushLayoutsRef.current();
  }, []);

  const interruptSaveForDrag = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (savedHideTimer.current) clearTimeout(savedHideTimer.current);
    saveGeneration.current += 1;
  }, []);

  const scheduleLayoutSave = useCallback((personId: string, position: { x: number; y: number }) => {
    if (readOnly) return;
    pendingLayouts.current.set(personId, position);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(() => flushLayoutsRef.current(), LAYOUT_SAVE_DELAY_MS);
  }, [readOnly]);

  const handleNodeDragStart = useCallback<OnNodeDrag<Node>>((_event, node) => {
    draggingRef.current = true;
    interruptSaveForDrag();
    onNodeDragStartRef.current?.(node.id);
    setSaveStatus((current) => (current === "saved" || current === "error" ? "idle" : current));
  }, [interruptSaveForDrag]);

  const handleNodeDragStop = useCallback<OnNodeDrag<Node>>((_event, node) => {
    draggingRef.current = false;
    onNodeDragStopRef.current?.(node.id);
    scheduleLayoutSave(node.id, node.position);
  }, [scheduleLayoutSave]);

  const handleSelectionDragStart = useCallback<SelectionDragHandler<Node>>((_event, draggedNodes) => {
    draggingRef.current = true;
    interruptSaveForDrag();
    const nodeIds = draggedNodes.map((node) => node.id);
    nodeIds.forEach((nodeId) => onNodeDragStartRef.current?.(nodeId));
    onSelectionDragStartRef.current?.(nodeIds);
    setSaveStatus((current) => (current === "saved" || current === "error" ? "idle" : current));
  }, [interruptSaveForDrag]);

  const handleSelectionDragStop = useCallback<SelectionDragHandler<Node>>((_event, draggedNodes) => {
    draggingRef.current = false;
    const nodeIds = draggedNodes.map((node) => node.id);
    nodeIds.forEach((nodeId) => onNodeDragStopRef.current?.(nodeId));
    draggedNodes.forEach((node) => scheduleLayoutSave(node.id, node.position));
    onSelectionDragStopRef.current?.(nodeIds);
  }, [scheduleLayoutSave]);

  const handleToolModeChange = useCallback((nextMode: FamilyTreeCanvasToolMode) => {
    setToolMode(nextMode);
    if (nextMode === "pointer") {
      setNodes((current) => current.map((node) => ({ ...node, selected: false })));
    }
  }, [setNodes]);

  function handleLayoutsReset() {
    interruptSaveForDrag();
    pendingLayouts.current.clear();
    setSaveStatus("idle");
    onLayoutsReset?.();
    router.refresh();
  }

  return (
    <ReactFlow
      className={selectToolActive ? "family-tree-canvas--select-tool" : undefined}
      nodes={nodes}
      edges={edges}
      nodeTypes={familyTreeNodeTypes}
      edgeTypes={familyTreeEdgeTypes}
      onNodesChange={onNodesChange}
      onNodeDragStart={readOnly ? undefined : handleNodeDragStart}
      onNodeDragStop={readOnly ? undefined : handleNodeDragStop}
      onSelectionDragStart={selectToolActive ? handleSelectionDragStart : undefined}
      onSelectionDragStop={selectToolActive ? handleSelectionDragStop : undefined}
      onPaneClick={() => {
        if (selectToolActive) {
          setNodes((current) => current.map((node) => ({ ...node, selected: false })));
        }
        onPaneClick();
      }}
      onNodeClick={(_, node) => {
        if (selectToolActive) return;
        onNodeClick(node);
      }}
      nodesDraggable={!readOnly}
      nodesConnectable={false}
      elementsSelectable={selectToolActive}
      selectionOnDrag={selectToolActive}
      panOnDrag={selectToolActive ? [1, 2] : true}
      elevateNodesOnSelect
      minZoom={0.2}
      maxZoom={1.6}
      defaultViewport={{ x: 0, y: 0, zoom: FAMILY_LAYOUT.initialZoom }}
      proOptions={{ hideAttribution: true }}
    >
      <FamilyTreeInitialViewport subjectId={subjectId} nodes={nodes} />
      <Background gap={18} size={1} color="#dce5db" />
      {saveStatus !== "idle" && (
        <div className="family-tree-canvas-save-status" data-state={saveStatus} role="status" aria-live="polite">
          {saveStatus === "saving" ? <LoaderCircle className="animate-spin" size={13} /> : saveStatus === "error" ? <X size={13} /> : <Check size={13} />}
          <span>{saveStatus === "saving" ? copy.saving : saveStatus === "saved" ? copy.saved : copy.error}</span>
        </div>
      )}
      <div className="family-tree-canvas-tools">
        {!readOnly && <FamilyTreeCanvasToolModeControl locale={locale} mode={toolMode} onChange={handleToolModeChange} />}
        <Controls />
        {!readOnly && <FamilyTreeResetLayoutControl locale={locale} onReset={handleLayoutsReset} />}
      </div>
      <MiniMap
        zoomable
        pannable
        nodeColor="#fffef9"
        nodeStrokeColor="#b7b0a6"
        nodeBorderRadius={8}
        nodeStrokeWidth={1.5}
        maskColor="rgb(36 49 43 / 0.08)"
        maskStrokeColor="#c4bdb3"
        maskStrokeWidth={1.25}
        bgColor="#e4dfd5"
      />
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
