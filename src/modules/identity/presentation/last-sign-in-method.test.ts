import { describe, expect, it } from "vitest";
import {
  LAST_SIGN_IN_STORAGE_KEY,
  LEGACY_LAST_SIGN_IN_STORAGE_KEY,
  PENDING_SIGN_IN_COOKIE,
  lastSignInCaption,
  readLastSignInMethod,
  readPendingSignInMethod,
  resolveLastSignInMethod,
  writeLastSignInMethod,
} from "./last-sign-in-method";

function memoryStore(initial: Record<string, string> = {}) {
  const values = { ...initial };
  return {
    values,
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
    },
    setItem(key: string, value: string) {
      values[key] = value;
    },
    removeItem(key: string) {
      delete values[key];
    },
  };
}

describe("last sign-in method", () => {
  it("returns null when nothing has been stored", () => {
    expect(readLastSignInMethod(memoryStore())).toBeNull();
    expect(readLastSignInMethod(null)).toBeNull();
  });

  it("writes only a known method and reads it back", () => {
    const storage = memoryStore();
    expect(writeLastSignInMethod("google", storage)).toBe(true);
    expect(storage.values[LAST_SIGN_IN_STORAGE_KEY]).toBe("google");
    expect(readLastSignInMethod(storage)).toBe("google");
  });

  it("ignores unknown stored values", () => {
    const storage = memoryStore({ [LAST_SIGN_IN_STORAGE_KEY]: "github" });
    expect(readLastSignInMethod(storage)).toBeNull();
    expect(storage.values[LAST_SIGN_IN_STORAGE_KEY]).toBe("github");
  });

  it("migrates the legacy key and then removes it", () => {
    const storage = memoryStore({ [LEGACY_LAST_SIGN_IN_STORAGE_KEY]: "credentials" });
    expect(readLastSignInMethod(storage)).toBe("email");
    expect(storage.values[LAST_SIGN_IN_STORAGE_KEY]).toBe("email");
    expect(storage.values[LEGACY_LAST_SIGN_IN_STORAGE_KEY]).toBeUndefined();
  });

  it("keeps the current key when both keys are present", () => {
    const storage = memoryStore({
      [LAST_SIGN_IN_STORAGE_KEY]: "google",
      [LEGACY_LAST_SIGN_IN_STORAGE_KEY]: "email",
    });
    expect(readLastSignInMethod(storage)).toBe("google");
    expect(storage.values[LEGACY_LAST_SIGN_IN_STORAGE_KEY]).toBe("email");
  });

  it("adopts a pending Google sign-in over a stored email method", () => {
    const storage = memoryStore({ [LAST_SIGN_IN_STORAGE_KEY]: "email" });
    const header = `theme=dark; ${PENDING_SIGN_IN_COOKIE}=google`;
    expect(readPendingSignInMethod(header)).toBe("google");
    expect(resolveLastSignInMethod(storage, header)).toBe("google");
    expect(storage.values[LAST_SIGN_IN_STORAGE_KEY]).toBe("google");
  });

  it("does not treat a similarly named cookie as pending", () => {
    expect(readPendingSignInMethod(`${PENDING_SIGN_IN_COOKIE}_extra=google`)).toBeNull();
  });

  it("survives a storage that throws", () => {
    const broken: Parameters<typeof readLastSignInMethod>[0] = {
      getItem() {
        throw new Error("denied");
      },
      setItem() {
        throw new Error("denied");
      },
      removeItem() {
        throw new Error("denied");
      },
    };
    expect(readLastSignInMethod(broken)).toBeNull();
    expect(writeLastSignInMethod("email", broken)).toBe(false);
    expect(resolveLastSignInMethod(broken, `${PENDING_SIGN_IN_COOKIE}=google`)).toBe("google");
  });

  it("phrases the caption in the same voice as the login copy", () => {
    expect(lastSignInCaption("email", "en")).toBe("You last signed in with Email");
    expect(lastSignInCaption("google", "es")).toBe("La última vez entraste con Google");
  });
});
