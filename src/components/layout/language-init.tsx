"use client";

import { useEffect } from "react";

const LANG_EVENT = "tabibi-lang-change";

export type TabibiLang = "ar" | "en";

export function applyDocumentLang(lang: TabibiLang) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
}

/** مزامنة أولية من localStorage — يُستخدم في الجذر */
export function LanguageInit() {
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("tabibi-lang");
      const lang: TabibiLang = stored === "en" ? "en" : "ar";
      applyDocumentLang(lang);
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}

export function subscribeLangChange(handler: (lang: TabibiLang) => void) {
  const fn = (e: Event) => {
    const d = (e as CustomEvent<TabibiLang>).detail;
    if (d === "ar" || d === "en") handler(d);
  };
  window.addEventListener(LANG_EVENT, fn as EventListener);
  return () => window.removeEventListener(LANG_EVENT, fn as EventListener);
}

export function dispatchLangChange(lang: TabibiLang) {
  window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: lang }));
}
