export const THEME_STORAGE_KEY = "yls-theme";
export const THEME_CHANGE_EVENT = "yls-theme-change";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const THEME_BACKGROUNDS: Record<ResolvedTheme, string> = {
  light: "#faf7f0",
  dark: "#141a17",
};

export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  if (preference === "dark") return "dark";
  if (preference === "light") return "light";
  return systemDark ? "dark" : "light";
}

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    /* private mode */
  }
  return "system";
}

export function applyThemePreference(preference: ThemePreference) {
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = resolveTheme(preference, systemDark);
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.setAttribute("data-theme-preference", preference);
  root.style.colorScheme = theme;
  root.style.backgroundColor = THEME_BACKGROUNDS[theme];
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function getServerThemePreference(): ThemePreference {
  return "system";
}

export function subscribeThemePreference(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY || event.key === null) onStoreChange();
  };
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

export const themeInitScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var s=localStorage.getItem(k);var p=s==="light"||s==="dark"||s==="system"?s:"system";var d=window.matchMedia("(prefers-color-scheme: dark)").matches;var t=p==="dark"||(p==="system"&&d)?"dark":"light";var r=document.documentElement;r.setAttribute("data-theme",t);r.setAttribute("data-theme-preference",p);r.style.colorScheme=t;r.style.backgroundColor=t==="dark"?"#141a17":"#faf7f0";}catch(e){}})();`;
