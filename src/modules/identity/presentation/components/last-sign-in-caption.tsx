import { lastSignInCaption, type SignInMethod } from "../last-sign-in-method";

export function LastSignInCaption({ method, locale }: { method: SignInMethod; locale: "es" | "en" }) {
  return (
    <p className="mt-2 text-center text-[11px] font-medium text-[var(--last-sign-in)]">
      {lastSignInCaption(method, locale)}
    </p>
  );
}
