"use client";

import { useEffect, useState } from "react";
import IconGlobe from "@/components/icon/icon-globe";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  applyDocumentLang,
  dispatchLangChange,
  subscribeLangChange,
  type TabibiLang,
} from "@/components/layout/language-init";

type Props = { isDark: boolean };

export function LanguageToggle({ isDark }: Props) {
  const [lang, setLang] = useState<TabibiLang>("ar");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("tabibi-lang");
      setLang(stored === "en" ? "en" : "ar");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    return subscribeLangChange((l) => setLang(l));
  }, []);

  const toggle = () => {
    const next: TabibiLang = lang === "ar" ? "en" : "ar";
    try {
      window.localStorage.setItem("tabibi-lang", next);
      applyDocumentLang(next);
      dispatchLangChange(next);
      setLang(next);
      toast.success(next === "ar" ? "تم التبديل إلى العربية" : "Switched to English");
    } catch {
      toast.error("تعذّر حفظ اختيار اللغة");
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "rounded-lg p-2.5 transition-colors",
        isDark
          ? "text-gray-400 hover:bg-gray-800 hover:text-white"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-900",
      )}
      title={lang === "ar" ? "التبديل إلى الإنجليزية (واجهة عربية حالياً)" : "Switch to Arabic"}
      aria-label={lang === "ar" ? "Toggle interface language" : "التبديل إلى العربية"}
    >
      <IconGlobe className="h-[18px] w-[18px]" />
    </button>
  );
}
