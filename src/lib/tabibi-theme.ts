"use client";

import { useCallback, useSyncExternalStore } from "react";

export const TABIBI_THEME_EVENT = "tabibi-theme-change";

export type TabibiTheme = "light" | "dark";

export function getTabibiThemeSnapshot(): TabibiTheme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribeTabibiTheme(onStoreChange: () => void) {
  const handler = () => onStoreChange();
  window.addEventListener(TABIBI_THEME_EVENT, handler);
  return () => window.removeEventListener(TABIBI_THEME_EVENT, handler);
}

/**
 * مصدر واحد للثيم: DOM + localStorage + حدث واحد لتحديث كل المشتركين دون تكرار setState.
 */
export function applyTabibiTheme(next: TabibiTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = next;
  try {
    window.localStorage.setItem("tabibi-theme", next);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(TABIBI_THEME_EVENT, { detail: next }));
}

export function toggleTabibiTheme() {
  const next = getTabibiThemeSnapshot() === "dark" ? "light" : "dark";
  applyTabibiTheme(next);
}

export function useTabibiTheme(): TabibiTheme {
  return useSyncExternalStore(
    subscribeTabibiTheme,
    getTabibiThemeSnapshot,
    () => "light",
  );
}

export function useTabibiThemeToggle() {
  const theme = useTabibiTheme();
  const toggle = useCallback(() => {
    toggleTabibiTheme();
  }, []);
  return { theme, toggle, isDark: theme === "dark" };
}
