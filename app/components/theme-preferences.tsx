"use client";

import { useState, useSyncExternalStore } from "react";
import {
  applyResolvedTheme,
  readThemePreference,
  saveThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/app/lib/theme-preference";

const preferences: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

let inMemoryPreference: ThemePreference | null = null;

function readPreference(): ThemePreference {
  if (inMemoryPreference) return inMemoryPreference;

  try {
    return readThemePreference(window.localStorage);
  } catch {
    return "system";
  }
}

function subscribe(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
    inMemoryPreference = null;
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener("sakata-theme-change", onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("sakata-theme-change", onStoreChange);
  };
}

function updateInMemoryPreference(preference: ThemePreference | null) {
  inMemoryPreference = preference;
}

export default function ThemePreferences() {
  const selected = useSyncExternalStore(
    subscribe,
    readPreference,
    () => "system",
  );
  const [persistenceError, setPersistenceError] = useState(false);

  function selectPreference(preference: ThemePreference) {
    let saved = true;
    try {
      saveThemePreference(preference, window.localStorage);
    } catch {
      saved = false;
    }

    updateInMemoryPreference(saved ? null : preference);

    if (preference === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      applyResolvedTheme(media.matches ? "dark" : "light", document.documentElement);
    } else {
      applyResolvedTheme(preference, document.documentElement);
    }

    setPersistenceError(!saved);
  }

  return (
    <section
      aria-labelledby="theme-preference-title"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <h2
        id="theme-preference-title"
        className="text-lg font-semibold text-slate-900 dark:text-white"
      >
        Appearance
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Choose the theme used throughout SAKATA OS.
      </p>
      <div
        role="group"
        aria-label="Theme preference"
        className="mt-4 inline-flex flex-wrap gap-2"
      >
        {preferences.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={selected === value}
            onClick={() => selectPreference(value)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 aria-pressed:border-sky-700 aria-pressed:bg-sky-50 aria-pressed:text-sky-900 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:aria-pressed:border-sky-400 dark:aria-pressed:bg-sky-950 dark:aria-pressed:text-sky-100"
          >
            {label}
          </button>
        ))}
      </div>
      <p role="status" aria-live="polite" className="mt-3 min-h-5 text-sm text-red-700 dark:text-red-300">
        {persistenceError
          ? "Theme changed for this visit, but the preference could not be saved."
          : ""}
      </p>
    </section>
  );
}
