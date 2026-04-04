"use client";

import IconMoon from "@/components/icon/icon-moon";
import IconSun from "@/components/icon/icon-sun";
import NotificationBell from "@/components/notifications/notification-bell";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import IconRefresh from "@/components/icon/icon-refresh";
import DashboardGlobalSearch from "@/components/dashboard/dashboard-global-search";
import { useTabibiThemeToggle } from "@/lib/tabibi-theme";
import { DashboardUserMenu } from "@/components/layout/dashboard-user-menu";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { useTranslation } from "@/lib/i18n-context";

export default function DashboardHeader() {
  const router = useRouter();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const { isDark, toggle: toggleTheme } = useTabibiThemeToggle();

  const handleRefresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <header
      className={cn(
        "flex w-full min-h-14 shrink-0 items-center justify-between gap-2 border-b px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:h-16 sm:gap-3 sm:px-5 sm:py-0",
        isDark ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white shadow-sm"
      )}
    >
      <div className="flex min-w-0 flex-1 justify-start">
        <DashboardGlobalSearch isDark={isDark} />
      </div>

      <div className="hidden shrink-0 items-center gap-0.5 sm:gap-1 lg:flex">
        <button
          type="button"
          onClick={toggleTheme}
          className={cn(
            "rounded-lg p-2.5 transition-colors",
            isDark ? "text-gray-400 hover:bg-gray-800 hover:text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          )}
          title={isDark ? t("header.day_mode") : t("header.night_mode")}
          aria-label={isDark ? t("header.day_mode") : t("header.night_mode")}
        >
          {isDark ? <IconSun className="h-[18px] w-[18px]" /> : <IconMoon className="h-[18px] w-[18px]" />}
        </button>

        <LanguageToggle isDark={isDark} />

        <NotificationBell theme={isDark ? "dark" : "light"} />

        <button
          type="button"
          onClick={handleRefresh}
          className={cn(
            "rounded-lg p-2.5 transition-colors",
            isDark ? "text-gray-400 hover:bg-gray-800 hover:text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          )}
          title={t("header.refresh")}
        >
          <IconRefresh className={cn("h-[18px] w-[18px]", refreshing && "animate-spin")} />
        </button>

        <div className={cn("mx-1 hidden h-5 w-px sm:block", isDark ? "bg-gray-700" : "bg-gray-200")} />

        <DashboardUserMenu isDark={isDark} />
      </div>
    </header>
  );
}