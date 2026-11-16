export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "sakata-theme";

export type ThemePreferenceStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export function resolveThemePreference(
  preference: ThemePreference,
  systemTheme: ResolvedTheme,
): ResolvedTheme {
  return preference === "system" ? systemTheme : preference;
}

export function readThemePreference(
  storage: ThemePreferenceStorage,
): ThemePreference {
  const preference = storage.getItem(THEME_STORAGE_KEY);
  return preference === "light" || preference === "dark"
    ? preference
    : "system";
}

export function saveThemePreference(
  preference: ThemePreference,
  storage: ThemePreferenceStorage,
): void {
  if (preference === "system") {
    storage.removeItem(THEME_STORAGE_KEY);
  } else {
    storage.setItem(THEME_STORAGE_KEY, preference);
  }
}

export const themeInitializationScript = `(()=>{const k=${JSON.stringify(THEME_STORAGE_KEY)};let p="system";try{const v=localStorage.getItem(k);if(v==="light"||v==="dark")p=v}catch{}const s=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";const t=p==="system"?s:p;const r=document.documentElement;r.dataset.theme=t;r.style.colorScheme=t})()`;

export function applyResolvedTheme(
  theme: ResolvedTheme,
  root: HTMLElement,
): void {
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  window.dispatchEvent(new Event("sakata-theme-change"));
}
