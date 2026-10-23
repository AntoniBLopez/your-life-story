"use client";

import { useLastSignInMethod } from "../use-last-sign-in-method";

/** Moves a successful Google sign-in from the handoff cookie into localStorage. */
export function PromoteLastSignInMethod() {
  useLastSignInMethod();
  return null;
}
