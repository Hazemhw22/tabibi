import { cookies } from "next/headers";
import { Locale, translations } from "./i18n-context";

export async function getI18nServer() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("tabibi_locale")?.value as Locale) || "ar";

  const t = (key: string, params?: Record<string, string | number>): string => {
    const parts = key.split(".");
    let current = translations[locale] || translations["ar"] || {};
    
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

  return { t, locale, dir: locale === "en" ? "ltr" : "rtl" };
}
