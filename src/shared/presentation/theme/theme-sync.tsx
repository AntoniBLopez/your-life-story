"use client";

import { useEffect } from "react";
import { applyThemePreference, readThemePreference } from "./theme";

export function ThemeSync() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readThemePreference() === "system") applyThemePreference("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return null;
}
