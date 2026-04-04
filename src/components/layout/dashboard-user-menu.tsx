"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Dropdown, { type DropdownHandle } from "@/components/ui/dropdown";
import { getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";
import IconUser from "@/components/icon/icon-user";
import IconSettings from "@/components/icon/icon-settings";
import IconLogout from "@/components/icon/icon-logout";
import IconCaretDown from "@/components/icon/icon-caret-down";
import { useTranslation } from "@/lib/i18n-context";

type Props = {
  isDark: boolean;
  /** زر أيقونة فقط (شريط الجوال بجانب القائمة) */
  compact?: boolean;
};

export function DashboardUserMenu({ isDark, compact = false }: Props) {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const userMenuRef = useRef<DropdownHandle>(null);

  const name = session?.user?.name ?? "";
  const email = session?.user?.email ?? "";
  const role = session?.user?.role;

  const roleLabel = (() => {
    if (role === "DOCTOR") return t("roles.doctor");
    if (role === "PLATFORM_ADMIN") return t("roles.platform_admin");
    if (role === "CLINIC_ADMIN") return t("roles.clinic_admin");
    if (role === "MEDICAL_CENTER_ADMIN") return t("roles.medical_center");
    if (role === "MEDICAL_CENTER_RECEPTIONIST") return t("roles.receptionist");
    if (role === "MEDICAL_CENTER_LAB_STAFF") return t("roles.lab_staff");
    if (role === "DOCTOR_RECEPTION" || role === "DOCTOR_ASSISTANT") return t("roles.clinic_staff");
    return "";
  })();

  const settingsHref =
    role === "DOCTOR"
      ? "/dashboard/doctor/settings"
      : role === "PLATFORM_ADMIN" || role === "CLINIC_ADMIN"
        ? "/dashboard/admin/settings"
        : role === "MEDICAL_CENTER_ADMIN"
          ? "/dashboard/medical-center/settings"
          : role === "MEDICAL_CENTER_RECEPTIONIST" || role === "MEDICAL_CENTER_LAB_STAFF"
            ? "/profile"
            : "/settings";

  return (
    <Dropdown
      ref={userMenuRef}
      placement="bottom-end"
      onOpenChange={setDropdownOpen}
      btnClassName={cn(
        "flex items-center rounded-xl transition-colors",
        compact ? "gap-0 p-0.5" : "gap-3 px-3 py-2",
        isDark ? "hover:bg-gray-800" : "hover:bg-gray-100"
      )}
      button={
        <>
          {!compact && (
            <div className="hidden text-right leading-tight sm:block">
              <p className={cn("text-sm font-semibold", isDark ? "text-white" : "text-gray-900")}>{name}</p>
              {roleLabel && <p className={cn("text-xs", isDark ? "text-gray-400" : "text-gray-500")}>{roleLabel}</p>}
            </div>
          )}
          <Avatar className={cn("shrink-0", compact ? "h-8 w-8" : "h-8 w-8")}>
            <AvatarFallback className="bg-blue-600 text-sm font-bold text-white">
              {getInitials(name || "U")}
            </AvatarFallback>
          </Avatar>
          {!compact && (
            <IconCaretDown
              className={cn(
                "h-3.5 w-3.5 shrink-0 transition-transform",
                isDark ? "text-gray-400" : "text-gray-500",
                dropdownOpen && "rotate-180"
              )}
            />
          )}
        </>
      }
      popperClassName="w-56"
    >
      <div
        className={cn(
          "overflow-hidden rounded-xl border shadow-xl",
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
            {t("user_menu.profile")}
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
            {t("user_menu.settings")}
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
            {t("user_menu.logout")}
          </button>
        </div>
      </div>
    </Dropdown>
  );
}
