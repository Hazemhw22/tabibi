"use client";

import { useSession, signOut } from "next-auth/react";
import { RefreshCw, User, Settings, LogOut, ChevronDown, Moon, Sun } from "lucide-react";
import NotificationBell from "@/components/notifications/notification-bell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function DashboardHeader() {
  const { data: session } = useSession();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("tabibi-theme");
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const initial = stored === "dark" || (!stored && prefersDark) ? "dark" : "light";
    document.documentElement.dataset.theme = initial;
    setTheme(initial);
  }, []);

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

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const name  = session?.user?.name  ?? "";
  const email = session?.user?.email ?? "";
  const role  = session?.user?.role;

  const roleLabel =
    role === "DOCTOR"          ? "طبيب"
    : role === "PLATFORM_ADMIN"  ? "مشرف المنصة"
    : role === "CLINIC_ADMIN"    ? "مشرف عيادة"
    : "";

  const settingsHref =
    role === "DOCTOR"
      ? "/dashboard/doctor/settings"
      : role === "PLATFORM_ADMIN" || role === "CLINIC_ADMIN"
        ? "/dashboard/admin/settings"
        : "/settings";

  const isDark = theme === "dark";

  return (
    <header
      className={cn(
        "flex h-14 sm:h-16 shrink-0 items-center justify-between border-b px-3 sm:px-5",
        isDark ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white"
      )}
    >

      {/* ── Right — empty placeholder to keep justify-between ── */}
      <div />

      {/* ── Left — theme toggle + notification + refresh + user ────────────── */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
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

        {/* Notification */}
        <NotificationBell theme={isDark ? "dark" : "light"} />

        {/* Refresh */}
        <button
          type="button"
          onClick={handleRefresh}
          className="rounded-lg p-2.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          title="تحديث"
        >
          <RefreshCw className={cn("h-[18px] w-[18px]", refreshing && "animate-spin")} />
        </button>

        <div className="mx-1 h-5 w-px bg-gray-700" />

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((o) => !o)}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 transition-colors",
            isDark ? "hover:bg-gray-800" : "hover:bg-gray-100"
          )}
        >
          <div className="hidden text-right leading-tight sm:block">
            <p className={cn("text-sm font-semibold", isDark ? "text-white" : "text-gray-900")}>{name}</p>
            {roleLabel && <p className={cn("text-xs", isDark ? "text-gray-400" : "text-gray-500")}>{roleLabel}</p>}
          </div>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-blue-600 text-white text-sm font-bold">
              {getInitials(name || "U")}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isDark ? "text-gray-400" : "text-gray-500", dropdownOpen && "rotate-180")} />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div
            className={cn(
              "absolute left-0 top-full mt-2 w-56 rounded-xl border shadow-xl z-50 overflow-hidden",
              isDark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-white"
            )}
          >
            <div className={cn("border-b px-4 py-3", isDark ? "border-gray-800" : "border-gray-100")}>
              <p className={cn("truncate text-sm font-semibold", isDark ? "text-white" : "text-gray-900")}>{name}</p>
              <p className={cn("mt-0.5 truncate text-xs", isDark ? "text-gray-400" : "text-gray-500")}>{email}</p>
            </div>

            <div className="py-1">
              <Link
                href="/profile"
                onClick={() => setDropdownOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                  isDark ? "text-gray-300 hover:bg-gray-800 hover:text-white" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <User className="h-4 w-4 shrink-0" />
                الملف الشخصي
              </Link>
              <Link
                href={settingsHref}
                onClick={() => setDropdownOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                  isDark ? "text-gray-300 hover:bg-gray-800 hover:text-white" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Settings className="h-4 w-4 shrink-0" />
                الإعدادات
              </Link>
            </div>

            <div className={cn("border-t py-1", isDark ? "border-gray-800" : "border-gray-100")}>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                  isDark ? "text-red-400 hover:bg-red-900/20 hover:text-red-300" : "text-red-600 hover:bg-red-50 hover:text-red-700"
                )}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                تسجيل الخروج
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </header>
  );
}
