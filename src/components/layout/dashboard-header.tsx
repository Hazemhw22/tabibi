"use client";

import { useSession, signOut } from "next-auth/react";
import { Moon, Sun } from "lucide-react";
import NotificationBell from "@/components/notifications/notification-bell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import IconRefresh from "@/components/icon/icon-refresh";
import IconUser from "@/components/icon/icon-user";
import IconSettings from "@/components/icon/icon-settings";
import IconLogout from "@/components/icon/icon-logout";
import IconCaretDown from "@/components/icon/icon-caret-down";
import Dropdown, { type DropdownHandle } from "@/components/ui/dropdown";
import DashboardGlobalSearch from "@/components/dashboard/dashboard-global-search";

export default function DashboardHeader() {
  const { data: session } = useSession();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    const stored = window.localStorage.getItem("tabibi-theme");
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const initial = stored === "dark" || (!stored && prefersDark) ? "dark" : "light";
    document.documentElement.dataset.theme = initial;
    return initial;
  });
  const userMenuRef = useRef<DropdownHandle>(null);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("tabibi-theme", next);
      document.documentElement.dataset.theme = next;
      window.dispatchEvent(new CustomEvent("tabibi-theme-change", { detail: next }));
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 800);
  };

  const name = session?.user?.name ?? "";
  const email = session?.user?.email ?? "";
  const role = session?.user?.role;

  const roleLabel =
    role === "DOCTOR"
      ? "طبيب"
      : role === "PLATFORM_ADMIN"
        ? "مشرف المنصة"
        : role === "CLINIC_ADMIN"
          ? "مشرف عيادة"
          : role === "MEDICAL_CENTER_ADMIN"
            ? "مركز طبي"
            : "";

  const settingsHref =
    role === "DOCTOR"
      ? "/dashboard/doctor/settings"
      : role === "PLATFORM_ADMIN" || role === "CLINIC_ADMIN"
        ? "/dashboard/admin/settings"
        : role === "MEDICAL_CENTER_ADMIN"
          ? "/dashboard/medical-center/settings"
          : "/settings";

  // --- التعديل هنا ---
  // إذا كان المستخدم طبيب أو مركز طبي، نجعل isDark دائماً true
  const forceDarkMode = role === "DOCTOR" || role === "MEDICAL_CENTER_ADMIN";
  const isDark = forceDarkMode ? true : theme === "dark";
  
  // إخفاء زر التبديل إذا كان الوضع إجباري غامق
  const showThemeToggle = !forceDarkMode;

  return (
    <header
      className={cn(
        "flex h-14 sm:h-16 shrink-0 items-center justify-between gap-3 border-b px-3 sm:px-5",
        isDark ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white shadow-sm"
      )}
    >
      <div className="min-w-0 flex-1 flex justify-start sm:max-w-xl lg:max-w-md">
        <DashboardGlobalSearch isDark={isDark} />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {showThemeToggle && (
          <button
            type="button"
            onClick={toggleTheme}
            className={cn(
              "rounded-lg p-2.5 transition-colors",
              isDark ? "text-gray-400 hover:bg-gray-800 hover:text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            )}
            title={isDark ? "الوضع النهاري" : "الوضع الليلي"}
          >
            {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>
        )}

        <NotificationBell theme={isDark ? "dark" : "light"} />

        <button
          type="button"
          onClick={handleRefresh}
          className={cn(
            "rounded-lg p-2.5 transition-colors",
            isDark ? "text-gray-400 hover:bg-gray-800 hover:text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          )}
          title="تحديث"
        >
          <IconRefresh className={cn("h-[18px] w-[18px]", refreshing && "animate-spin")} />
        </button>

        <div className={cn("mx-1 h-5 w-px", isDark ? "bg-gray-700" : "bg-gray-200")} />

        <Dropdown
          ref={userMenuRef}
          placement="bottom-end"
          onOpenChange={setDropdownOpen}
          btnClassName={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 transition-colors",
            isDark ? "hover:bg-gray-800" : "hover:bg-gray-100"
          )}
          button={
            <>
              <div className="hidden text-right leading-tight sm:block">
                <p className={cn("text-sm font-semibold", isDark ? "text-white" : "text-gray-900")}>{name}</p>
                {roleLabel && <p className={cn("text-xs", isDark ? "text-gray-400" : "text-gray-500")}>{roleLabel}</p>}
              </div>
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-blue-600 text-white text-sm font-bold">
                  {getInitials(name || "U")}
                </AvatarFallback>
              </Avatar>
              <IconCaretDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform shrink-0",
                  isDark ? "text-gray-400" : "text-gray-500",
                  dropdownOpen && "rotate-180"
                )}
              />
            </>
          }
          popperClassName="w-56"
        >
          <div
            className={cn(
              "rounded-xl border shadow-xl overflow-hidden",
              isDark ? "border-gray-700 bg-gray-900 text-white" : "border-gray-200 bg-white"
            )}
          >
            <div className={cn("border-b px-4 py-3", isDark ? "border-gray-800" : "border-gray-100")}>
              <p className={cn("truncate text-sm font-semibold", isDark ? "text-white" : "text-gray-900")}>{name}</p>
              <p className={cn("mt-0.5 truncate text-xs", isDark ? "text-gray-400" : "text-gray-500")}>{email}</p>
            </div>

            <div className="py-1">
              <Link
                href="/profile"
                onClick={() => userMenuRef.current?.close()}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                  isDark ? "text-gray-300 hover:bg-gray-800 hover:text-white" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <IconUser className="h-4 w-4 shrink-0" />
                الملف الشخصي
              </Link>
              <Link
                href={settingsHref}
                onClick={() => userMenuRef.current?.close()}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                  isDark ? "text-gray-300 hover:bg-gray-800 hover:text-white" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <IconSettings className="h-4 w-4 shrink-0" />
                الإعدادات
              </Link>
            </div>

            <div className={cn("border-t py-1", isDark ? "border-gray-800" : "border-gray-100")}>
              <button
                type="button"
                onClick={() => {
                  userMenuRef.current?.close();
                  void signOut({ callbackUrl: "/login" });
                }}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                  isDark ? "text-red-400 hover:bg-red-900/20 hover:text-red-300" : "text-red-600 hover:bg-red-50 hover:text-red-700"
                )}
              >
                <IconLogout className="h-4 w-4 shrink-0" />
                تسجيل الخروج
              </button>
            </div>
          </div>
        </Dropdown>
      </div>
    </header>
  );
}