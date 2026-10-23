"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  LAST_SIGN_IN_STORAGE_KEY,
  LEGACY_LAST_SIGN_IN_STORAGE_KEY,
  PENDING_SIGN_IN_COOKIE,
  type SignInMethod,
  parseSignInMethod,
  readPendingSignInMethod,
  resolveLastSignInMethod,
  writeLastSignInMethod,
  type KeyValueStore,
} from "./last-sign-in-method";

const CHANGE_EVENT = "yls-last-sign-in-change";

function browserStorage(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function cookieHeader(): string {
  try {
    return document.cookie;
  } catch {
    return "";
  }
}

function clearPendingSignInCookie() {
  try {
    document.cookie = `${PENDING_SIGN_IN_COOKIE}=; Max-Age=0; path=/`;
  } catch {
    // Cookie access can throw in hardened browsers. The stored method still stands.
  }
}

function peekLastSignInMethod(): SignInMethod | null {
  const pending = readPendingSignInMethod(cookieHeader());
  if (pending) return pending;
  const storage = browserStorage();
  if (!storage) return null;
  try {
    return parseSignInMethod(storage.getItem(LAST_SIGN_IN_STORAGE_KEY))
      ?? parseSignInMethod(storage.getItem(LEGACY_LAST_SIGN_IN_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Move a successful Google handoff, and any legacy key, into the current localStorage key. */
export function promoteLastSignInMethod(): SignInMethod | null {
  const header = cookieHeader();
  const pending = readPendingSignInMethod(header);
  const storage = browserStorage();
  const method = resolveLastSignInMethod(storage, header);
  if (pending && writeLastSignInMethod(pending, storage)) clearPendingSignInCookie();
  return method;
}

function serverSnapshot(): SignInMethod | null {
  return null;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function useLastSignInMethod() {
  const method = useSyncExternalStore(subscribe, peekLastSignInMethod, serverSnapshot);

  useEffect(() => {
    promoteLastSignInMethod();
  }, []);

  const remember = useCallback((next: SignInMethod) => {
    writeLastSignInMethod(next, browserStorage());
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { method, remember };
}
