"use client";

import { BoxSelect, MousePointer2 } from "lucide-react";

export type FamilyTreeCanvasToolMode = "pointer" | "select";

export function FamilyTreeCanvasToolModeControl({
  locale,
  mode,
  onChange,
}: {
  locale: "es" | "en";
  mode: FamilyTreeCanvasToolMode;
  onChange: (mode: FamilyTreeCanvasToolMode) => void;
}) {
  const t = locale === "es"
    ? {
        pointer: "Cursor: seleccionar persona y mover un nodo",
        select: "Seleccionar varios nodos y moverlos juntos",
      }
    : {
        pointer: "Pointer: select a person and move one node",
        select: "Select multiple nodes and move them together",
      };

  return (
    <div className="family-tree-canvas-tool-group" role="group" aria-label={locale === "es" ? "Herramientas del canvas" : "Canvas tools"}>
      <button
        type="button"
        className="family-tree-canvas-tool-btn"
        aria-label={t.pointer}
        title={t.pointer}
        aria-pressed={mode === "pointer"}
        onClick={() => onChange("pointer")}
      >
        <MousePointer2 size={16} />
      </button>
      <button
        type="button"
        className="family-tree-canvas-tool-btn"
        aria-label={t.select}
        title={t.select}
        aria-pressed={mode === "select"}
        onClick={() => onChange("select")}
      >
        <BoxSelect size={16} />
      </button>
    </div>
  );
}
