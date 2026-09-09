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
        label: "Reordenar árbol por defecto",
        title: "Reordenar árbol",
        body: "Perderás las posiciones actuales de los nodos y se sustituirán por un árbol ordenado por defecto.",
        continue: "Continuar",
        finalTitle: "¿Seguro?",
        finalBody: "Esta acción no se puede deshacer. Todos los nodos volverán a su disposición automática.",
        confirm: "Sí, reordenar árbol",
        back: "Volver",
        cancel: "Cancelar",
      }
    : {
        label: "Reset tree to default layout",
        title: "Reset tree layout",
        body: "You will lose the current node positions and they will be replaced with the default ordered tree.",
        continue: "Continue",
        finalTitle: "Are you sure?",
        finalBody: "This cannot be undone. Every node will return to the automatic layout.",
        confirm: "Yes, reset tree",
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
