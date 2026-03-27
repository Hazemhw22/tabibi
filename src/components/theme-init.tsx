"use client";

import { useEffect } from "react";
import { applyTabibiTheme } from "@/lib/tabibi-theme";

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
      applyTabibiTheme(initial);
    } catch {
      /* ignore */
    }
  }, []);

  return null;
}
