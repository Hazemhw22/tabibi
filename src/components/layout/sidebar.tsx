"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
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

const doctorNav: NavItem[] = [
  { label: "الرئيسية", href: "/dashboard/doctor", icon: LayoutDashboard },
  { label: "المرضى", href: "/dashboard/doctor/patients", icon: Users },
  { label: "المواعيد", href: "/dashboard/doctor/appointments", icon: Calendar },
  { label: "التقارير", href: "/dashboard/doctor/reports", icon: TrendingUp },
  { label: "الإعدادات", href: "/dashboard/doctor/settings", icon: Settings },
];

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
}

function SidebarContent({ nav, roleLabel, pathname, onLinkClick }: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-800 px-4 py-3">
        <Image
          src="/88e178c9-facc-41a2-8f98-9252ccce19ee.png"
          alt="Tabibi"
          width={160}
          height={40}
          className="h-9 w-auto shrink-0 max-w-[140px]"
        />
        <p className="text-xs text-gray-400 truncate">{roleLabel}</p>
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
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
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
      <div className="shrink-0 border-t border-gray-800 px-5 py-3 text-center">
        <p className="text-[11px] text-gray-500">© {new Date().getFullYear()} طبيبي. جميع الحقوق محفوظة.</p>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = session?.user?.role;
  const nav =
    role === "DOCTOR"
      ? doctorNav
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
      <aside className="hidden lg:flex flex-col w-60 bg-gray-900 border-l border-gray-800 min-h-screen shrink-0">
        <SidebarContent
          nav={nav}
          roleLabel={roleLabel}
          pathname={pathname}
          onLinkClick={() => setMobileOpen(false)}
        />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 right-0 left-0 z-40 bg-gray-900 border-b border-gray-800 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white font-bold text-sm min-w-0">
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
          className="text-gray-400 hover:text-white p-1.5"
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
          "lg:hidden fixed top-14 right-0 bottom-0 z-40 w-64 bg-gray-900 border-l border-gray-800 transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <SidebarContent
          nav={nav}
          roleLabel={roleLabel}
          pathname={pathname}
          onLinkClick={() => setMobileOpen(false)}
        />
      </aside>
    </>
  );
}
