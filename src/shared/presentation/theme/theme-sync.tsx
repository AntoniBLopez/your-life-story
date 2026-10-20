"use client";

import { useEffect } from "react";
import { applyThemePreference, readThemePreference, THEME_STORAGE_KEY } from "./theme";

export function ThemeSync() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => {
      if (readThemePreference() === "system") applyThemePreference("system");
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
      const preference = readThemePreference();
      if (document.documentElement.getAttribute("data-theme-preference") === preference) return;
      applyThemePreference(preference);
    };
    media.addEventListener("change", onScheme);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onScheme);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
