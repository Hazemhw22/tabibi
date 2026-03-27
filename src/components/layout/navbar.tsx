"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import IconSun from "@/components/icon/icon-sun";
import IconMoon from "@/components/icon/icon-moon";
import IconUser from "@/components/icon/icon-user";
import IconCalendar from "@/components/icon/icon-calendar";
import IconSettings from "@/components/icon/icon-settings";
import IconLogout from "@/components/icon/icon-logout";
import IconCaretDown from "@/components/icon/icon-caret-down";
import IconHeart from "@/components/icon/icon-heart";
import IconMenuWidgets from "@/components/icon/menu/icon-menu-widgets";
import IconXCircle from "@/components/icon/icon-x-circle";
import NotificationBell from "@/components/notifications/notification-bell";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useTabibiThemeToggle } from "@/lib/tabibi-theme";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTabibiThemeToggle();

  const role = session?.user?.role;

  const getDashboardLink = () => {
    switch (role) {
      case "DOCTOR":
        return "/dashboard/doctor";
      case "PLATFORM_ADMIN":
        return "/dashboard/admin";
      case "CLINIC_ADMIN":
        return "/dashboard/admin";
      case "MEDICAL_CENTER_ADMIN":
      case "MEDICAL_CENTER_RECEPTIONIST":
      case "MEDICAL_CENTER_LAB_STAFF":
        return "/dashboard/medical-center";
      default:
        return "/dashboard/patient";
    }
  };

  return (
    <nav className={cn(
      "sticky top-0 z-40 w-full border-b shadow-sm",
      theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"
    )}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-2">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-blue-600 shrink-0 min-w-0">
            <Image
              src="/88e178c9-facc-41a2-8f98-9252ccce19ee.png"
              alt="Tabibi"
              width={220}
              height={52}
              className="h-16 sm:h-12 w-auto max-w-[200px] sm:max-w-[220px]"
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {[
              { href: "/medical-centers", label: "المراكز الطبية" },
              { href: "/doctors", label: "الأطباء" },
              { href: "/specialties", label: "التخصصات" },
              { href: "/about", label: "عن المنصة" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn("text-sm font-medium hover:text-blue-500 transition-colors", theme === "dark" ? "text-slate-300" : "text-gray-600")}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Auth Section */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="تبديل الوضع الليلي"
              onClick={toggleTheme}
            >
              {theme === "dark" ? (
                <IconSun className="h-5 w-5" />
              ) : (
                <IconMoon className="h-5 w-5" />
              )}
            </Button>
            {session ? (
              <div className="flex items-center gap-3">
                <NotificationBell theme={theme === "dark" ? "dark" : "light"} />
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className={cn("flex items-center gap-2 rounded-lg p-1.5 transition-colors", theme === "dark" ? "hover:bg-slate-700" : "hover:bg-gray-100")}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session.user.image || ""} />
                      <AvatarFallback className="text-xs">
                        {getInitials(session.user.name || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-right">
                      <p className={cn("text-sm font-medium leading-none", theme === "dark" ? "text-slate-100" : "text-gray-800")}>
                        {session.user.name}
                      </p>
                      <p className={cn("text-xs mt-0.5", theme === "dark" ? "text-slate-400" : "text-gray-500")}>
                        {role === "DOCTOR"
                          ? "طبيب"
                          : role === "PLATFORM_ADMIN"
                            ? "مشرف"
                            : role === "MEDICAL_CENTER_ADMIN"
                              ? "مركز طبي"
                              : role === "MEDICAL_CENTER_RECEPTIONIST"
                                ? "استقبال"
                                : role === "MEDICAL_CENTER_LAB_STAFF"
                                  ? "مختبر / أشعة"
                                  : "مريض"}
                      </p>
                    </div>
                    <IconCaretDown className="h-4 w-4 text-gray-400" />
                  </button>

                  {dropdownOpen && (
                    <div className={cn(
                      "absolute left-0 top-12 w-48 rounded-xl border shadow-lg py-1 z-50",
                      theme === "dark"
                        ? "bg-slate-800 border-slate-700"
                        : "bg-white border-gray-200"
                    )}>
                      {role === "PATIENT" && (
                        <>
                          <Link
                            href="/dashboard/patient"
                            className={cn("flex items-center gap-2 px-4 py-2 text-sm", theme === "dark" ? "text-slate-200 hover:bg-slate-700" : "text-gray-700 hover:bg-gray-50")}
                            onClick={() => setDropdownOpen(false)}
                          >
                            <IconUser className="h-4 w-4" />
                            صفحتي
                          </Link>
                          <Link
                            href="/dashboard/patient/appointments"
                            className={cn("flex items-center gap-2 px-4 py-2 text-sm", theme === "dark" ? "text-slate-200 hover:bg-slate-700" : "text-gray-700 hover:bg-gray-50")}
                            onClick={() => setDropdownOpen(false)}
                          >
                            <IconCalendar className="h-4 w-4" />
                            مواعيدي
                          </Link>
                          <Link
                            href="/dashboard/patient/transactions"
                            className={cn("flex items-center gap-2 px-4 py-2 text-sm", theme === "dark" ? "text-slate-200 hover:bg-slate-700" : "text-gray-700 hover:bg-gray-50")}
                            onClick={() => setDropdownOpen(false)}
                          >
                            <IconHeart className="h-4 w-4" />
                            معاملاتي
                          </Link>
                          <hr className={cn("my-1", theme === "dark" ? "border-slate-700" : "border-gray-100")} />
                        </>
                      )}
                      {role === "PATIENT" ? (
                        <Link
                          href="/dashboard/patient/settings"
                          className={cn("flex items-center gap-2 px-4 py-2 text-sm", theme === "dark" ? "text-slate-200 hover:bg-slate-700" : "text-gray-700 hover:bg-gray-50")}
                          onClick={() => setDropdownOpen(false)}
                        >
                          <IconSettings className="h-4 w-4" />
                          الإعدادات
                        </Link>
                      ) : (
                        <Link
                          href={getDashboardLink()}
                          className={cn("flex items-center gap-2 px-4 py-2 text-sm", theme === "dark" ? "text-slate-200 hover:bg-slate-700" : "text-gray-700 hover:bg-gray-50")}
                          onClick={() => setDropdownOpen(false)}
                        >
                          <IconCalendar className="h-4 w-4" />
                          لوحة التحكم
                        </Link>
                      )}
                      <Link
                        href="/profile"
                        className={cn("flex items-center gap-2 px-4 py-2 text-sm", theme === "dark" ? "text-slate-200 hover:bg-slate-700" : "text-gray-700 hover:bg-gray-50")}
                        onClick={() => setDropdownOpen(false)}
                      >
                        <IconUser className="h-4 w-4" />
                        الملف الشخصي
                      </Link>
                      <hr className={cn("my-1", theme === "dark" ? "border-slate-700" : "border-gray-100")} />
                      <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 w-full text-right"
                      >
                        <IconLogout className="h-4 w-4" />
                        تسجيل الخروج
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">تسجيل الدخول</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">إنشاء حساب</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile theme + notifications + menu buttons */}
          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className={cn("p-2 rounded-lg transition-colors", theme === "dark" ? "text-slate-300 hover:bg-slate-800" : "text-gray-600 hover:bg-gray-100")}
              aria-label="تبديل الوضع الليلي"
            >
              {theme === "dark" ? (
                <IconSun className="h-5 w-5" />
              ) : (
                <IconMoon className="h-5 w-5" />
              )}
            </button>
            {session && <NotificationBell theme={theme} />}
            <button
              className={cn("p-2 rounded-lg transition-colors", theme === "dark" ? "text-slate-300 hover:bg-slate-800" : "text-gray-600 hover:bg-gray-100")}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="فتح القائمة"
            >
              {menuOpen ? <IconXCircle className="h-5 w-5" /> : <IconMenuWidgets className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          "md:hidden border-t overflow-hidden transition-all duration-300",
          theme === "dark" ? "border-slate-700 bg-slate-900" : "border-gray-100 bg-white",
          menuOpen ? "max-h-screen" : "max-h-0"
        )}
      >
        <div className="px-4 py-3 space-y-1">
          {[
            { href: "/medical-centers", label: "المراكز الطبية" },
            { href: "/doctors", label: "الأطباء" },
            { href: "/specialties", label: "التخصصات" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn("block px-3 py-2 text-sm font-medium rounded-lg transition-colors", theme === "dark" ? "text-slate-300 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-100")}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          {session ? (
            <>
              {role === "PATIENT" && (
                <>
                  {[
                    { href: "/dashboard/patient", label: "صفحتي" },
                    { href: "/dashboard/patient/appointments", label: "مواعيدي" },
                    { href: "/dashboard/patient/transactions", label: "معاملاتي" },
                    { href: "/dashboard/patient/settings", label: "الإعدادات" },
                  ].map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className={cn("block px-3 py-2 text-sm font-medium rounded-lg transition-colors", theme === "dark" ? "text-slate-300 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-100")}
                      onClick={() => setMenuOpen(false)}
                    >
                      {l.label}
                    </Link>
                  ))}
                </>
              )}
              {role !== "PATIENT" && (
                <Link
                  href={getDashboardLink()}
                  className={cn("block px-3 py-2 text-sm font-medium rounded-lg transition-colors", theme === "dark" ? "text-slate-300 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-100")}
                  onClick={() => setMenuOpen(false)}
                >
                  لوحة التحكم
                </Link>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="block w-full text-right px-3 py-2 text-sm font-medium text-red-500 rounded-lg hover:bg-red-500/10"
              >
                تسجيل الخروج
              </button>
            </>
          ) : (
            <div className="flex gap-2 pt-2">
              <Link href="/login" className="flex-1">
                <Button variant="outline" className="w-full" size="sm">دخول</Button>
              </Link>
              <Link href="/register" className="flex-1">
                <Button className="w-full" size="sm">تسجيل</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
