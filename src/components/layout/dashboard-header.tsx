"use client";

import { useSession, signOut } from "next-auth/react";
import { RefreshCw, User, Settings, LogOut, ChevronDown } from "lucide-react";
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
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-800 bg-gray-900 px-5">

      {/* ── Right — empty placeholder to keep justify-between ── */}
      <div />

      {/* ── Left — icons + user avatar + dropdown ────────────── */}
      <div className="flex items-center gap-1">
        {/* Notification */}
        <NotificationBell theme="dark" />

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
          className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-gray-800"
        >
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-sm font-semibold text-white">{name}</p>
            {roleLabel && <p className="text-xs text-gray-400">{roleLabel}</p>}
          </div>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-blue-600 text-white text-sm font-bold">
              {getInitials(name || "U")}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className={cn("h-3.5 w-3.5 text-gray-400 transition-transform", dropdownOpen && "rotate-180")} />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-gray-700 bg-gray-900 shadow-xl z-50 overflow-hidden">
            <div className="border-b border-gray-800 px-4 py-3">
              <p className="truncate text-sm font-semibold text-white">{name}</p>
              <p className="mt-0.5 truncate text-xs text-gray-400">{email}</p>
            </div>

            <div className="py-1">
              <Link
                href="/profile"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
              >
                <User className="h-4 w-4 shrink-0" />
                الملف الشخصي
              </Link>
              <Link
                href={settingsHref}
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
              >
                <Settings className="h-4 w-4 shrink-0" />
                الإعدادات
              </Link>
            </div>

            <div className="border-t border-gray-800 py-1">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-900/20 hover:text-red-300"
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
