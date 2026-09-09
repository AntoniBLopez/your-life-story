"use client";

import { useState, useTransition } from "react";
import { ListTree } from "lucide-react";
import { resetFamilyNodeLayoutsAction } from "@/modules/family-tree/application/family-actions";
import { ConfirmDialog } from "@/modules/life-story/presentation/components/confirm-dialog";

export function FamilyTreeResetLayoutControl({
  locale,
  onReset,
}: {
  locale: "es" | "en";
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const t = locale === "es"
    ? {
        label: "Restablecer disposición del árbol",
        title: "Restablecer disposición del árbol",
        body: "Solo cambiará cómo están colocados los nodos en el canvas: volverán al diseño automático. Los datos de cada persona (nombre, fechas, vínculos, recordatorios, etc.) no se borran.",
        continue: "Continuar",
        finalTitle: "¿Restablecer disposición?",
        finalBody: "Se eliminarán los ajustes manuales de posición que hayas hecho arrastrando nodos. El contenido de tu árbol familiar se mantiene intacto.",
        confirm: "Sí, restablecer disposición",
        back: "Volver",
        cancel: "Cancelar",
      }
    : {
        label: "Reset tree layout",
        title: "Reset tree layout",
        body: "Only the node positions on the canvas will change back to the automatic layout. Each person's data (name, dates, relationships, reminders, etc.) is not deleted.",
        continue: "Continue",
        finalTitle: "Reset layout?",
        finalBody: "Manual position adjustments from dragging nodes will be cleared. Your family tree content stays exactly the same.",
        confirm: "Yes, reset layout",
        back: "Go back",
        cancel: "Cancel",
      };

  function close() {
    if (pending) return;
    setOpen(false);
    setStep(1);
    setError(undefined);
  }

  function confirmReset() {
    setError(undefined);
    startTransition(async () => {
      const result = await resetFamilyNodeLayoutsAction(locale);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      close();
      onReset();
    });
  }

  return (
    <>
      <button
        type="button"
        className="family-tree-canvas-tool-btn"
        aria-label={t.label}
        title={t.label}
        onClick={() => {
          setStep(1);
          setError(undefined);
          setOpen(true);
        }}
      >
        <ListTree size={16} />
      </button>
      <ConfirmDialog
        open={open}
        title={step === 1 ? t.title : t.finalTitle}
        body={`${step === 1 ? t.body : t.finalBody}${error ? `\n\n${error}` : ""}`}
        cancelLabel={step === 1 ? t.cancel : t.back}
        onClose={() => {
          if (pending) return;
          if (step === 2) setStep(1);
          else close();
        }}
        actions={step === 1
          ? [{ label: t.continue, onClick: () => { setError(undefined); setStep(2); }, variant: "primary" }]
          : [{ label: pending ? "…" : t.confirm, onClick: confirmReset, variant: "danger" }]}
      />
    </>
  );
}
