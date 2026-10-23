/**
 * Remembers how someone last signed in so the login form can mark that control.
 * The value lives in localStorage and is intentionally left in place on logout.
 */

export const SIGN_IN_METHODS = ["email", "google"] as const;

export type SignInMethod = (typeof SIGN_IN_METHODS)[number];

/** Current storage key. Logout must not clear it. */
export const LAST_SIGN_IN_STORAGE_KEY = "yls-last-sign-in-method";

/**
 * Key written by the previous last-used indicator. Read once when the current
 * key is empty, then removed so later reads use only the new key.
 */
export const LEGACY_LAST_SIGN_IN_STORAGE_KEY = "auth_last_login_provider";

/** Short-lived handoff set by the server after a successful Google sign-in. */
export const PENDING_SIGN_IN_COOKIE = "yls_pending_sign_in";

export type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

const METHOD_LABEL: Record<SignInMethod, { es: string; en: string }> = {
  email: { es: "Email", en: "Email" },
  google: { es: "Google", en: "Google" },
};

export function parseSignInMethod(value: string | null | undefined): SignInMethod | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "google") return "google";
  if (normalized === "email" || normalized === "credentials" || normalized === "password") return "email";
  return null;
}

export function lastSignInCaption(method: SignInMethod, locale: "es" | "en"): string {
  const label = METHOD_LABEL[method][locale];
  return locale === "es" ? `La última vez entraste con ${label}` : `You last signed in with ${label}`;
}

export function readLastSignInMethod(storage: KeyValueStore | null): SignInMethod | null {
  if (!storage) return null;
  try {
    const current = parseSignInMethod(storage.getItem(LAST_SIGN_IN_STORAGE_KEY));
    if (current) return current;

    const legacy = parseSignInMethod(storage.getItem(LEGACY_LAST_SIGN_IN_STORAGE_KEY));
    if (!legacy) return null;

    storage.setItem(LAST_SIGN_IN_STORAGE_KEY, legacy);
    storage.removeItem(LEGACY_LAST_SIGN_IN_STORAGE_KEY);
    return legacy;
  } catch {
    return null;
  }
}

export function writeLastSignInMethod(method: SignInMethod, storage: KeyValueStore | null): boolean {
  if (!storage) return false;
  try {
    storage.setItem(LAST_SIGN_IN_STORAGE_KEY, method);
    return true;
  } catch {
    return false;
  }
}

export function readPendingSignInMethod(cookieHeader: string | null | undefined): SignInMethod | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const name = part.slice(0, separator).trim();
    if (name !== PENDING_SIGN_IN_COOKIE) continue;
    return parseSignInMethod(decodeURIComponent(part.slice(separator + 1).trim()));
  }
  return null;
}

/** Prefer a just-completed Google sign-in, then the stored method (migrating the legacy key). */
export function resolveLastSignInMethod(storage: KeyValueStore | null, cookieHeader: string | null | undefined): SignInMethod | null {
  const pending = readPendingSignInMethod(cookieHeader);
  if (pending) {
    writeLastSignInMethod(pending, storage);
    return pending;
  }
  return readLastSignInMethod(storage);
}
