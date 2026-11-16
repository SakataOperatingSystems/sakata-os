"use client";

import { useEffect } from "react";
import {
  applyResolvedTheme,
  resolveThemePreference,
  THEME_STORAGE_KEY,
} from "@/app/lib/theme-preference";

function savedPreference() {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function systemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export default function ThemeRuntime() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateFromPreference = () => {
      applyResolvedTheme(
        resolveThemePreference(savedPreference(), systemTheme()),
        document.documentElement,
      );
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        updateFromPreference();
      }
    };
    const handleSystemChange = () => {
      if (savedPreference() === "system") updateFromPreference();
    };

    window.addEventListener("storage", handleStorage);
    media.addEventListener("change", handleSystemChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      media.removeEventListener("change", handleSystemChange);
    };
  }, []);

  return null;
}
