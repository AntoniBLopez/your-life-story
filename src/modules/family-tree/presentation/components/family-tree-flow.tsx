"use client";

import type { ReactNode } from "react";
import { BaseEdge, EdgeLabelRenderer, getStraightPath, Handle, Position, type EdgeProps, type NodeProps } from "@xyflow/react";
import { HeartHandshake } from "lucide-react";

type FamilyPersonNodeData = {
  label: ReactNode;
};

export function FamilyPersonNode({ data }: NodeProps) {
  const nodeData = data as FamilyPersonNodeData;
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} id="top" className="!h-1 !w-1 !min-h-0 !min-w-0 !border-0 !bg-transparent !opacity-0" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!h-1 !w-1 !min-h-0 !min-w-0 !border-0 !bg-transparent !opacity-0" />
      <Handle type="source" position={Position.Right} id="right" className="!h-1 !w-1 !min-h-0 !min-w-0 !border-0 !bg-transparent !opacity-0" />
      <Handle type="target" position={Position.Left} id="left" className="!h-1 !w-1 !min-h-0 !min-w-0 !border-0 !bg-transparent !opacity-0" />
      {nodeData.label}
    </div>
  );
}

export function FamilyPartnerEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: "#c89f78",
          strokeWidth: 1.5,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan flex h-7 w-7 items-center justify-center rounded-full border border-[#e8d4c4] bg-[#fff8f2] text-[#a96d4d] shadow-sm"
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "none",
          }}
        >
          <HeartHandshake size={14} strokeWidth={2.25} aria-hidden />
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const familyTreeNodeTypes = {
  familyPerson: FamilyPersonNode,
};

export const familyTreeEdgeTypes = {
  familyPartner: FamilyPartnerEdge,
};
