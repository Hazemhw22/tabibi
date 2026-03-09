"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  Stethoscope,
  Menu,
  X,
  UserCheck,
  TrendingUp,
  ShieldCheck,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const doctorNavFull: NavItem[] = [
  { label: "الرئيسية", href: "/dashboard/doctor", icon: LayoutDashboard },
  { label: "المرضى", href: "/dashboard/doctor/patients", icon: Users },
  { label: "المواعيد", href: "/dashboard/doctor/appointments", icon: Calendar },
  { label: "التقارير", href: "/dashboard/doctor/reports", icon: TrendingUp },
  { label: "الإعدادات", href: "/dashboard/doctor/settings", icon: Settings },
];

/** للطبيب المرفوض: فقط الرئيسية */
const doctorNavRejected: NavItem[] = doctorNavFull.slice(0, 1);

const adminNav: NavItem[] = [
  { label: "لوحة تحكم", href: "/dashboard/admin", icon: LayoutDashboard },
  { label: "الأطباء", href: "/dashboard/admin/doctors", icon: Stethoscope },
  { label: "الاشتراكات", href: "/dashboard/admin/subscriptions", icon: TrendingUp },
  { label: "الإعدادات", href: "/dashboard/admin/settings", icon: ShieldCheck },
];

const patientNav: NavItem[] = [
  { label: "الرئيسية", href: "/dashboard/patient", icon: LayoutDashboard },
  { label: "مواعيدي", href: "/dashboard/patient/appointments", icon: Calendar },
  { label: "التقييمات", href: "/dashboard/patient/reviews", icon: UserCheck },
  { label: "الإعدادات", href: "/dashboard/patient/settings", icon: Settings },
];

interface SidebarContentProps {
  nav: NavItem[];
  roleLabel: string;
  pathname: string;
  onLinkClick: () => void;
  isDark: boolean;
}

function SidebarContent({ nav, roleLabel, pathname, onLinkClick, isDark }: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn("flex h-16 shrink-0 items-center gap-3 border-b px-4 py-3", isDark ? "border-gray-800" : "border-gray-200")}>
        <Image
          src="/88e178c9-facc-41a2-8f98-9252ccce19ee.png"
          alt="Tabibi"
          width={160}
          height={40}
          className="h-9 w-auto shrink-0 max-w-[140px]"
        />
        <p className={cn("text-xs truncate", isDark ? "text-gray-400" : "text-gray-500")}>{roleLabel}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map((item) => {
          const isActive =
            item.href === "/dashboard/doctor" ||
            item.href === "/dashboard/admin" ||
            item.href === "/dashboard/patient"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : isDark ? "text-gray-400 hover:text-white hover:bg-gray-800" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" size={18} />
              <span>{item.label}</span>
              {item.badge && (
                <span className="mr-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Copyright */}
      <div className={cn("shrink-0 border-t px-5 py-3 text-center", isDark ? "border-gray-800" : "border-gray-200")}>
        <p className={cn("text-[11px]", isDark ? "text-gray-500" : "text-gray-400")}>© {new Date().getFullYear()} طبيبي. جميع الحقوق محفوظة.</p>
      </div>
    </div>
  );
}

const THEME_EVENT = "tabibi-theme-change";

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [doctorStatus, setDoctorStatus] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("tabibi-theme");
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const initial = stored === "dark" || (!stored && prefersDark) ? "dark" : "light";
    setTheme(initial);
    const handler = (e: CustomEvent<"light" | "dark">) => setTheme(e.detail);
    window.addEventListener(THEME_EVENT, handler as EventListener);
    return () => window.removeEventListener(THEME_EVENT, handler as EventListener);
  }, []);

  const isDark = theme === "dark";

  const role = session?.user?.role;

  useEffect(() => {
    if (role !== "DOCTOR") return;
    fetch("/api/doctor/profile")
      .then((r) => r.json())
      .then((data) => setDoctorStatus(data?.doctor?.status ?? null))
      .catch(() => setDoctorStatus(null));
  }, [role]);

  const nav =
    role === "DOCTOR"
      ? doctorStatus === "REJECTED"
        ? doctorNavRejected
        : doctorNavFull
      : role === "PLATFORM_ADMIN" || role === "CLINIC_ADMIN"
        ? adminNav
        : patientNav;

  const roleLabel =
    role === "DOCTOR"
      ? "طبيب"
      : role === "PLATFORM_ADMIN"
        ? "مشرف المنصة"
        : role === "CLINIC_ADMIN"
          ? "مشرف عيادة"
          : "مريض";

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col w-60 min-h-screen shrink-0 border-l",
          isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
        )}
      >
        <SidebarContent
          nav={nav}
          roleLabel={roleLabel}
          pathname={pathname}
          onLinkClick={() => setMobileOpen(false)}
          isDark={isDark}
        />
      </aside>

      {/* Mobile Header */}
      <div
        className={cn(
          "lg:hidden fixed top-0 right-0 left-0 z-40 border-b px-4 h-14 flex items-center justify-between",
          isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
        )}
      >
        <div className={cn("flex items-center gap-2 font-bold text-sm min-w-0", isDark ? "text-white" : "text-gray-900")}>
          <Image
            src="/88e178c9-facc-41a2-8f98-9252ccce19ee.png"
            alt="Tabibi"
            width={160}
            height={40}
            className="h-9 w-auto max-w-[140px]"
          />
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className={cn("p-1.5", isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900")}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar Panel */}
      <aside
        className={cn(
          "lg:hidden fixed top-14 right-0 bottom-0 z-40 w-64 border-l transition-transform duration-300",
          isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200",
          mobileOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <SidebarContent
          nav={nav}
          roleLabel={roleLabel}
          pathname={pathname}
          onLinkClick={() => setMobileOpen(false)}
          isDark={isDark}
        />
      </aside>
    </>
  );
}
