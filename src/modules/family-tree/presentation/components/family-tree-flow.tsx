"use client";

import type { ReactNode } from "react";
import { BaseEdge, EdgeLabelRenderer, getStraightPath, Handle, Position, type EdgeProps, type NodeProps } from "@xyflow/react";
import { Heart, HeartHandshake } from "lucide-react";
import type { PartnerLinkKind } from "@/modules/family-tree/domain/family-layout";

type FamilyPersonNodeData = {
  label: ReactNode;
};

type FamilyPartnerEdgeData = {
  kind: PartnerLinkKind;
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
  data,
}: EdgeProps) {
  const edgeData = (data ?? {}) as FamilyPartnerEdgeData;
  const [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  const isPartner = edgeData.kind === "partner";
  const Icon = isPartner ? HeartHandshake : Heart;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: "#c89f78",
          strokeWidth: 1.5,
          strokeDasharray: isPartner ? undefined : "6 4",
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
          <Icon size={14} strokeWidth={2.25} aria-hidden />
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
