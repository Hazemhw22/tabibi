"use client";

import { useTranslation } from "@/lib/i18n-context";
import Dropdown from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import IconGlobe from "@/components/icon/icon-globe";

type Props = { isDark?: boolean };

export function LanguageToggle({ isDark }: Props) {
  const { locale, setLocale, t } = useTranslation();

  const languages = [
    { code: "ar", label: "العربية", short: "AR" },
    { code: "he", label: "עברית", short: "HE" },
    { code: "en", label: "English", short: "EN" },
  ] as const;

  const current = languages.find((l) => l.code === locale) || languages[0];

  return (
    <Dropdown
      placement="bottom-end"
      btnClassName={cn(
        "flex items-center gap-2 rounded-xl px-3 py-2 transition-all duration-200",
        isDark 
          ? "text-gray-400 hover:bg-gray-800 hover:text-white" 
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      )}
      button={
        <>
          <IconGlobe className="h-4.5 w-4.5" />
          <span className="text-xs font-bold uppercase tracking-wider">{current.short}</span>
        </>
      }
    >
      <div className={cn(
        "flex min-w-[140px] flex-col overflow-hidden rounded-2xl border p-1 shadow-xl",
        isDark ? "border-gray-800 bg-gray-950" : "border-gray-100 bg-white"
      )}>
        {languages.map((l) => (
          <button
            key={l.code}
            onClick={() => setLocale(l.code)}
            className={cn(
              "flex items-center justify-between rounded-xl px-3 py-2.5 text-right text-sm transition-colors",
              locale === l.code
                ? isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600 font-bold"
                : isDark ? "text-gray-400 hover:bg-gray-800" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <span>{l.label}</span>
            <span className="text-[10px] font-black opacity-40 uppercase">{l.short}</span>
          </button>
        ))}
      </div>
    </Dropdown>
  );
}
