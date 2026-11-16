import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  readThemePreference,
  resolveThemePreference,
  saveThemePreference,
  THEME_STORAGE_KEY,
  themeInitializationScript,
} from "../app/lib/theme-preference";

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("system-wide theme preferences", () => {
  it("persists explicit choices and uses system mode when no choice is saved", () => {
    const storage = createStorage();

    expect(readThemePreference(storage)).toBe("system");
    saveThemePreference("dark", storage);
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(readThemePreference(storage)).toBe("dark");

    saveThemePreference("system", storage);
    expect(storage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(readThemePreference(storage)).toBe("system");
  });

  it("resolves system mode from the operating-system preference", () => {
    expect(resolveThemePreference("system", "dark")).toBe("dark");
    expect(resolveThemePreference("system", "light")).toBe("light");
    expect(resolveThemePreference("dark", "light")).toBe("dark");
    expect(resolveThemePreference("light", "dark")).toBe("light");
  });

  it("initializes the document theme before hydration from storage or system mode", () => {
    expect(themeInitializationScript).toContain("localStorage.getItem");
    expect(themeInitializationScript).toContain("prefers-color-scheme: dark");
    expect(themeInitializationScript).toContain("document.documentElement");
    expect(themeInitializationScript).toContain("colorScheme=t");
  });

  it("keeps a single central preference surface and shared theme runtime", () => {
    const rootLayout = readFileSync(
      new URL("../app/layout.tsx", import.meta.url),
      "utf8",
    );
    const loginPage = readFileSync(
      new URL("../app/login/page.tsx", import.meta.url),
      "utf8",
    );
    const preferencesPage = readFileSync(
      new URL("../app/preferences/page.tsx", import.meta.url),
      "utf8",
    );
    const cataloguePage = readFileSync(
      new URL("../app/control/catalog/page.tsx", import.meta.url),
      "utf8",
    );
    const proxy = readFileSync(
      new URL("../app/lib/supabase/proxy.ts", import.meta.url),
      "utf8",
    );
    const applicationsPage = readFileSync(
      new URL("../app/applications/page.tsx", import.meta.url),
      "utf8",
    );
    const publicPage = readFileSync(
      new URL("../app/page.tsx", import.meta.url),
      "utf8",
    );
    const toggle = readFileSync(
      new URL("../app/components/theme-toggle.tsx", import.meta.url),
      "utf8",
    );
    const schoolLayout = readFileSync(
      new URL("../app/school/layout.tsx", import.meta.url),
      "utf8",
    );
    const controlLayout = readFileSync(
      new URL("../app/control/layout.tsx", import.meta.url),
      "utf8",
    );

    expect(rootLayout).toContain("ThemeRuntime");
    expect(publicPage).toContain("<ThemeToggle");
    expect(loginPage).toContain("<ThemeToggle");
    expect(loginPage).toContain('href="/preferences"');
    expect(applicationsPage).toContain('href="/preferences"');
    expect(applicationsPage).toContain("<ThemeToggle");
    expect(schoolLayout).toContain("<ThemeToggle");
    expect(controlLayout).toContain("<ThemeToggle");
    expect(cataloguePage).not.toContain("<ThemeToggle");
    expect(toggle).toContain("saveThemePreference");
    expect(toggle).toContain("applyResolvedTheme");
    expect(toggle).toContain("aria-label={`Switch to ${nextTheme} theme`}");
    expect(preferencesPage).toContain("ThemePreferences");
    expect(proxy).toContain('request.nextUrl.pathname === "/preferences"');
  });

  it("applies dark utility variants to the root theme attribute", () => {
    const stylesheet = readFileSync(
      new URL("../app/globals.css", import.meta.url),
      "utf8",
    );

    expect(stylesheet).toContain(
      '@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));',
    );
  });
});
