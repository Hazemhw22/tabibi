"use client";

import { useEffect } from "react";

/**
 * يطبّق tabibi-theme من localStorage على <html> في كل الصفحات (بما فيها /login و /register)
 * حتى تعمل أصناف `dark:` وقواعد globals.css قبل زيارة لوحة التحكم.
 */
export function ThemeInit() {
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("tabibi-theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initial = stored === "dark" || (!stored && prefersDark) ? "dark" : "light";
      document.documentElement.dataset.theme = initial;
    } catch {
      /* ignore */
    }
  }, []);

  return null;
}
