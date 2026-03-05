"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Menu,
  X,
  Heart,
  Calendar,
  User,
  LogOut,
  Settings,
  Bell,
  ChevronDown,
  Moon,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const role = session?.user?.role;

  // تهيئة الثيم من localStorage / النظام
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("tabibi-theme");
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const initial = stored === "dark" || (!stored && prefersDark) ? "dark" : "light";
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("tabibi-theme", next);
      document.documentElement.dataset.theme = next;
    }
  };

  const getDashboardLink = () => {
    switch (role) {
      case "DOCTOR":
        return "/dashboard/doctor";
      case "PLATFORM_ADMIN":
        return "/dashboard/admin";
      case "CLINIC_ADMIN":
        return "/dashboard/clinic";
      default:
        return "/dashboard/patient";
    }
  };

  return (
    <nav className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-18 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-blue-600">
            <Image
              src="/88e178c9-facc-41a2-8f98-9252ccce19ee.png"
              alt="Tabibi"
              width={90}
              height={20}
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/doctors"
              className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
            >
              الأطباء
            </Link>
            <Link
              href="/specialties"
              className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
            >
              التخصصات
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
            >
              عن المنصة
            </Link>
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
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            {session ? (
              <div className="flex items-center gap-3">
                <Link href="/notifications">
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                  </Button>
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-100 transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session.user.image || ""} />
                      <AvatarFallback className="text-xs">
                        {getInitials(session.user.name || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-800 leading-none">
                        {session.user.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {role === "DOCTOR" ? "طبيب" : role === "PLATFORM_ADMIN" ? "مشرف" : "مريض"}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute left-0 top-12 w-48 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
                      {role === "PATIENT" && (
                        <>
                          <Link
                            href="/dashboard/patient"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setDropdownOpen(false)}
                          >
                            <User className="h-4 w-4" />
                            صفحتي
                          </Link>
                          <Link
                            href="/dashboard/patient/appointments"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setDropdownOpen(false)}
                          >
                            <Calendar className="h-4 w-4" />
                            مواعيدي
                          </Link>
                          <Link
                            href="/dashboard/patient/transactions"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setDropdownOpen(false)}
                          >
                            <Heart className="h-4 w-4" />
                            معاملاتي
                          </Link>
                          <hr className="my-1 border-gray-100" />
                        </>
                      )}
                      <Link
                        href={getDashboardLink()}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Calendar className="h-4 w-4" />
                        لوحة التحكم
                      </Link>
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <User className="h-4 w-4" />
                        الملف الشخصي
                      </Link>
                      <Link
                        href="/settings"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Settings className="h-4 w-4" />
                        الإعدادات
                      </Link>
                      <hr className="my-1 border-gray-100" />
                      <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-right"
                      >
                        <LogOut className="h-4 w-4" />
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

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          "md:hidden border-t border-gray-100 bg-white overflow-hidden transition-all duration-300",
          menuOpen ? "max-h-screen" : "max-h-0"
        )}
      >
        <div className="px-4 py-3 space-y-2">
          <button
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 w-full justify-between"
          >
            <span>{theme === "dark" ? "وضع نهاري" : "وضع ليلي"}</span>
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
          <Link
            href="/doctors"
            className="block px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100"
            onClick={() => setMenuOpen(false)}
          >
            الأطباء
          </Link>
          <Link
            href="/specialties"
            className="block px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100"
            onClick={() => setMenuOpen(false)}
          >
            التخصصات
          </Link>
          {session ? (
            <>
              {role === "PATIENT" && (
                <>
                  <Link
                    href="/dashboard/patient"
                    className="block px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100"
                    onClick={() => setMenuOpen(false)}
                  >
                    صفحتي
                  </Link>
                  <Link
                    href="/dashboard/patient/appointments"
                    className="block px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100"
                    onClick={() => setMenuOpen(false)}
                  >
                    مواعيدي
                  </Link>
                  <Link
                    href="/dashboard/patient/transactions"
                    className="block px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100"
                    onClick={() => setMenuOpen(false)}
                  >
                    معاملاتي
                  </Link>
                </>
              )}
              <Link
                href={getDashboardLink()}
                className="block px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100"
                onClick={() => setMenuOpen(false)}
              >
                لوحة التحكم
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="block w-full text-right px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50"
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
