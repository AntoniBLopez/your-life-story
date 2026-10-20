"use client";

import { useEffect, useRef, useState } from "react";

export const flowCanvasColors = {
  dot: "var(--flow-dot)",
  minimapNode: "var(--minimap-node)",
  minimapNodeStroke: "var(--minimap-node-stroke)",
  minimapMask: "var(--minimap-mask)",
  minimapStroke: "var(--minimap-stroke)",
  minimapBg: "var(--minimap-bg)",
} as const;

/** Resolve CSS color tokens for canvas APIs that cannot read var(). */
export function useThemeColors<const T extends Record<string, string>>(tokens: T): T {
  const [colors, setColors] = useState(tokens);

  const tokensRef = useRef(tokens);
  tokensRef.current = tokens;
  const signature = Object.values(tokens).join("|");

  useEffect(() => {
    const read = () => {
      const current = tokensRef.current;
      const style = getComputedStyle(document.documentElement);
      const next = { ...current };
      for (const key of Object.keys(current) as (keyof T)[]) {
        const name = String(current[key]);
        const match = name.match(/^var\((--[^)]+)\)$/);
        if (!match) continue;
        const value = style.getPropertyValue(match[1]).trim();
        if (value) next[key] = value as T[keyof T];
      }
      setColors(next);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, [signature]);

  return colors;
}
