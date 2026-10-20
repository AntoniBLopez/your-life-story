"use client";

import { FormEvent } from "react";
import { LoaderCircle, Send } from "lucide-react";

export function ReflectionComposer({
  value,
  placeholder,
  sendLabel,
  disclaimer,
  error,
  sending,
  onChange,
  onSend,
}: {
  value: string;
  placeholder: string;
  sendLabel: string;
  disclaimer: string;
  error?: string | null;
  sending: boolean;
  onChange: (value: string) => void;
  onSend: (value: string) => void;
}) {
  function submit(event?: FormEvent) {
    event?.preventDefault();
    onSend(value);
  }

  return (
    <form onSubmit={submit} className="border-t border-[var(--line)] bg-[var(--paper)] p-3 sm:p-4">
      <div className="flex gap-3">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          className="textarea !min-h-12 flex-1 !py-3"
          placeholder={placeholder}
          maxLength={4000}
          rows={1}
          autoFocus
          aria-label={placeholder}
        />
        <button disabled={sending || !value.trim()} className="btn btn-primary self-end !px-4" type="submit">
          {sending ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}
          <span className="hidden sm:inline">{sendLabel}</span>
        </button>
      </div>
      {error && <p className="field-error">{error}</p>}
      <p className="mt-2 text-[11px] text-[var(--muted)]">{disclaimer}</p>
    </form>
  );
}
