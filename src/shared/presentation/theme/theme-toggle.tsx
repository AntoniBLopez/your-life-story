"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { applyThemePreference, readThemePreference, type ThemePreference } from "./theme";

const OPTIONS: { id: ThemePreference; icon: typeof Sun }[] = [
  { id: "light", icon: Sun },
  { id: "dark", icon: Moon },
  { id: "system", icon: Monitor },
];

function copy(locale: "es" | "en") {
  return locale === "es"
    ? { theme: "Tema", light: "Claro", dark: "Oscuro", system: "Sistema", menu: "Elegir tema" }
    : { theme: "Theme", light: "Light", dark: "Dark", system: "System", menu: "Choose theme" };
}

function useUiLocale(locale?: "es" | "en") {
  const pathname = usePathname();
  if (locale) return locale;
  if (pathname?.startsWith("/en")) return "en" as const;
  return "es" as const;
}

export function ThemeToggle({ locale, variant = "menu" }: { locale?: "es" | "en"; variant?: "menu" | "inline" }) {
  const ui = copy(useUiLocale(locale));
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    setPreference(readThemePreference());
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(next: ThemePreference) {
    setPreference(next);
    applyThemePreference(next);
    if (variant === "menu") setOpen(false);
  }

  if (variant === "inline") {
    return (
      <div className="theme-inline-track" role="radiogroup" aria-label={ui.theme}>
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = preference === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`theme-inline-option ${selected ? "is-selected" : ""}`}
              onClick={() => choose(option.id)}
            >
              <Icon size={15} aria-hidden />
              {ui[option.id]}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="theme-menu" ref={rootRef}>
      <button
        type="button"
        className="btn btn-quiet !p-2"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={ui.menu}
        title={ui.menu}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="theme-toggle-icon" aria-hidden>
          <Sun className="theme-icon theme-icon-light" size={16} />
          <Moon className="theme-icon theme-icon-dark" size={16} />
          <Monitor className="theme-icon theme-icon-system" size={16} />
        </span>
      </button>
      {open && (
        <div id={menuId} role="menu" aria-label={ui.theme} className="theme-menu-panel">
          <p className="theme-menu-label">{ui.theme}</p>
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = preference === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className={`theme-menu-item ${selected ? "is-selected" : ""}`}
                onClick={() => choose(option.id)}
              >
                <Icon size={15} aria-hidden />
                {ui[option.id]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
