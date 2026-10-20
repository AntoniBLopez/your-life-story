"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { grantAiConsentAction } from "../../application/reflection-actions";
import { reflectionCopy } from "../../domain/reflection-copy";

export function ReflectionConsentGate({ locale, onGranted }: { locale: "es" | "en"; onGranted: () => void }) {
  const copy = reflectionCopy(locale);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function grantConsent() {
    setError(undefined);
    startTransition(async () => {
      const result = await grantAiConsentAction(locale);
      if (!result.ok) setError(result.error);
      else onGranted();
    });
  }

  return (
    <section className="card mt-8 max-w-2xl p-7">
      <ShieldCheck className="text-[var(--moss)]" size={25} />
      <h2 className="display mt-4 text-3xl">{copy.consentTitle}</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{copy.consent}</p>
      <a className="mt-3 inline-block text-xs font-bold text-[var(--moss)] underline" href="https://developers.openai.com/api/docs/guides/your-data" target="_blank" rel="noreferrer">
        {copy.consentLink}
      </a>
      {error && <p className="field-error">{error}</p>}
      <button disabled={pending} onClick={grantConsent} className="btn btn-primary mt-6" type="button">
        {pending && <LoaderCircle className="animate-spin" size={15} />}
        {copy.consentAction}
      </button>
    </section>
  );
}
