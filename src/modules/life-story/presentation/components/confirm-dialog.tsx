"use client";

import { useEffect } from "react";

export type ConfirmDialogAction = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger";
};

type Props = {
  open: boolean;
  title: string;
  body: string;
  cancelLabel: string;
  actions: ConfirmDialogAction[];
  onClose: () => void;
};

export function ConfirmDialog({ open, title, body, cancelLabel, actions, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-[#24312b66] backdrop-blur-[2px]"
        aria-label={cancelLabel}
        onClick={onClose}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-body"
        className="card relative z-10 w-full max-w-md p-5 sm:p-6"
      >
        <h2 id="confirm-dialog-title" className="display text-2xl">{title}</h2>
        <p id="confirm-dialog-body" className="mt-3 text-sm leading-6 text-[var(--muted)]">{body}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <button type="button" className="btn btn-quiet" onClick={onClose}>{cancelLabel}</button>
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={
                action.variant === "danger"
                  ? "btn btn-danger"
                  : action.variant === "primary"
                    ? "btn btn-primary"
                    : "btn btn-secondary"
              }
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
