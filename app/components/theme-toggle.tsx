"use client";

import { useState, useSyncExternalStore } from "react";
import {
  applyResolvedTheme,
  saveThemePreference,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
} from "@/app/lib/theme-preference";

function getThemeSnapshot(): ResolvedTheme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribe(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY || event.key === null) onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener("sakata-theme-change", onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("sakata-theme-change", onStoreChange);
  };
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getThemeSnapshot, () => "light");
  const [persistenceError, setPersistenceError] = useState(false);
  const nextTheme = theme === "dark" ? "light" : "dark";

  function toggleTheme() {
    let persisted = true;
    try {
      saveThemePreference(nextTheme, window.localStorage);
    } catch {
      persisted = false;
    }

    applyResolvedTheme(nextTheme, document.documentElement);
    setPersistenceError(!persisted);
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        aria-label={`Switch to ${nextTheme} theme`}
        aria-pressed={theme === "dark"}
        onClick={toggleTheme}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-lg text-slate-800 shadow-sm transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
      >
        <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
      </button>
      {persistenceError && (
        <span role="status" className="sr-only">
          Theme changed for this visit, but the preference could not be saved.
        </span>
      )}
    </span>
  );
}
