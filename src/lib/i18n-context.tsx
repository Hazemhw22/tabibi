"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import ar from "../../messages/ar.json";
import en from "../../messages/en.json";
import he from "../../messages/he.json";

export type Locale = "ar" | "en" | "he";

export const translations: Record<Locale, any> = {
  ar,
  en,
  he,
};

type I18nContextType = {
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dir: "rtl" | "ltr";
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children, initialLocale = "ar" }: { children: ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    // Sync with HTML attributes on change
    document.documentElement.dir = locale === "en" ? "ltr" : "rtl";
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    // Set cookie for server-side persistence
    document.cookie = `tabibi_locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const parts = key.split(".");
    let current = translations[locale] || translations["ar"];

    for (const part of parts) {
      if (!current || typeof current !== "object" || current[part] === undefined) {
        return key;
      }
      current = current[part];
    }

    let result = String(current);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        result = result.replace(new RegExp(`{${k}}`, "g"), String(v));
      });
    }
    return result;
  };

  const dir = locale === "en" ? "ltr" : "rtl";

  return (
    <I18nContext.Provider value={{ t, locale, setLocale, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return context;
}
