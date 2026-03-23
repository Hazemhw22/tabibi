"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import IconMenuDashboard from "@/components/icon/menu/icon-menu-dashboard";
import IconUsersGroup from "@/components/icon/icon-users-group";
import IconCalendar from "@/components/icon/icon-calendar";
import IconBarChart from "@/components/icon/icon-bar-chart";
import IconClipboardText from "@/components/icon/icon-clipboard-text";
import IconSettings from "@/components/icon/icon-settings";
import IconMenuUsers from "@/components/icon/menu/icon-menu-users";
import IconStar from "@/components/icon/icon-star";
import IconFire from "@/components/icon/icon-fire";
import IconDollarSignCircle from "@/components/icon/icon-dollar-sign-circle";
import IconMenuWidgets from "@/components/icon/menu/icon-menu-widgets";
import IconBuilding from "@/components/icon/icon-building";
import IconXCircle from "@/components/icon/icon-x-circle";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const doctorSectionsFull: NavSection[] = [
  {
    title: "الرئيسية",
    items: [
      { label: "الرئيسية", href: "/dashboard/doctor", icon: IconMenuDashboard },
      { label: "المرضى", href: "/dashboard/doctor/patients", icon: IconUsersGroup },
      { label: "المواعيد", href: "/dashboard/doctor/appointments", icon: IconCalendar },
    ],
  },
  {
    title: "العيادة",
    items: [
      { label: "التقارير", href: "/dashboard/doctor/reports", icon: IconBarChart },
      { label: "العيادات والمواعيد", href: "/dashboard/doctor/clinics", icon: IconClipboardText },
    ],
  },
  {
    title: "الإعدادات",
    items: [{ label: "الإعدادات", href: "/dashboard/doctor/settings", icon: IconSettings }],
  },
];

const doctorSectionsLimited: NavSection[] = [
  { title: "الرئيسية", items: [{ label: "الرئيسية", href: "/dashboard/doctor", icon: IconMenuDashboard }] },
];

const adminSections: NavSection[] = [
  {
    title: "الرئيسية",
    items: [
      { label: "لوحة تحكم", href: "/dashboard/admin", icon: IconMenuDashboard },
      { label: "الأطباء", href: "/dashboard/admin/doctors", icon: IconMenuUsers },
      { label: "المراكز الطبية", href: "/dashboard/admin/medical-centers", icon: IconBuilding },
    ],
  },
  {
    title: "الإدارة",
    items: [{ label: "الاشتراكات", href: "/dashboard/admin/subscriptions", icon: IconBarChart }],
  },
  {
    title: "الإعدادات",
    items: [{ label: "الإعدادات", href: "/dashboard/admin/settings", icon: IconSettings }],
  },
];

type NavSection = { title: string; items: NavItem[] };

const medicalCenterSections: NavSection[] = [
  {
    title: "الرئيسية",
    items: [
      { label: "الرئيسية", href: "/dashboard/medical-center", icon: IconMenuDashboard },
      { label: "الأطباء", href: "/dashboard/medical-center/doctors", icon: IconMenuUsers },
      { label: "المرضى", href: "/dashboard/medical-center/patients", icon: IconUsersGroup },
      { label: "الحجوزات", href: "/dashboard/medical-center/appointments", icon: IconCalendar },
      { label: "الحسابات", href: "/dashboard/medical-center/finance", icon: IconDollarSignCircle },
    ],
  },
  {
    title: "الخدمات",
    items: [{ label: "الطوارئ", href: "/dashboard/medical-center/emergency", icon: IconFire }],
  },
  {
    title: "الإعدادات",
    items: [{ label: "إعدادات المركز", href: "/dashboard/medical-center/settings", icon: IconSettings }],
  },
];

const patientSections: NavSection[] = [
  {
    title: "الرئيسية",
    items: [
      { label: "الرئيسية", href: "/dashboard/patient", icon: IconMenuDashboard },
      { label: "مواعيدي", href: "/dashboard/patient/appointments", icon: IconCalendar },
      { label: "التقييمات", href: "/dashboard/patient/reviews", icon: IconStar },
    ],
  },
  {
    title: "الإعدادات",
    items: [{ label: "الإعدادات", href: "/dashboard/patient/settings", icon: IconSettings }],
  },
];

interface SidebarContentProps {
  sections: NavSection[];
  roleLabel: string;
  pathname: string;
  onLinkClick: () => void;
  isDark: boolean;
  userRole?: string;
  userName?: string | null;
  userImage?: string | null;
  doctorSpecialty?: string | null;
}

function SidebarContent({ sections, roleLabel, pathname, onLinkClick, isDark, userRole, userName, userImage, doctorSpecialty }: SidebarContentProps) {
  const linkClass = (item: NavItem, isActive: boolean) => {
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onLinkClick}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
          isActive
            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
            : isDark
              ? "text-gray-400 hover:text-white hover:bg-gray-800"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        )}
      >
        <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : isDark ? "text-gray-400" : "text-gray-500")} />
        <span>{item.label}</span>
        {item.badge && (
          <span className="mr-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  const isActiveHref = (href: string) =>
    href === "/dashboard/doctor" ||
    href === "/dashboard/admin" ||
    href === "/dashboard/patient" ||
    href === "/dashboard/medical-center"
      ? pathname === href
      : pathname.startsWith(href);

  return (
    <div className="flex flex-col h-full">
      {/* Header: Doctor profile card OR logo */}
      {userRole === "DOCTOR" ? (
        <div className={cn("px-4 pt-6 pb-5 text-center border-b", isDark ? "border-gray-800" : "border-gray-200")}>
          <div className="mx-auto h-[76px] w-[76px] rounded-full overflow-hidden bg-blue-900 border-[3px] border-blue-500/40 flex items-center justify-center">
            {userImage ? (
              <Image
                src={userImage}
                alt={userName ?? "طبيب"}
                width={76}
                height={76}
                className="object-cover w-full h-full"
                unoptimized
              />
            ) : (
              <span className="text-[2.2rem]">👨‍⚕️</span>
            )}
          </div>
          <h2 className={cn("mt-3 text-sm font-bold truncate px-2 leading-tight", isDark ? "text-white" : "text-gray-900")}>
            د. {userName}
          </h2>
          <p className={cn("text-xs mt-1 truncate px-2", isDark ? "text-blue-400" : "text-blue-600")}>
            {doctorSpecialty ?? "طبيب"}
          </p>
          <div className={cn("mt-3 h-px w-14 mx-auto", isDark ? "bg-gray-700" : "bg-gray-200")} />
        </div>
      ) : (
        <div className={cn("flex h-16 shrink-0 items-center gap-3 border-b px-4 py-3", isDark ? "border-gray-800" : "border-gray-200")}>
          <Image
            src="/88e178c9-facc-41a2-8f98-9252ccce19ee.png"
            alt="Tabibi"
            width={240}
            height={60}
            className="h-20 w-auto shrink-0 max-w-[240px] brightness-125"
            priority
          />
          <p className={cn("text-xs truncate", isDark ? "text-gray-400" : "text-gray-500")}>{roleLabel}</p>
        </div>
      )}

      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <p
              className={cn(
                "mb-2 px-3 text-[10px] font-bold uppercase tracking-wider",
                isDark ? "text-gray-500" : "text-gray-400"
              )}
            >
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => linkClass(item, isActiveHref(item.href)))}
            </div>
          </div>
        ))}
      </nav>

      

      <div className={cn("shrink-0 border-t px-5 py-3 text-center", isDark ? "border-gray-800" : "border-gray-200")}>
        <p className={cn("text-[11px]", isDark ? "text-gray-300" : "text-gray-400")}>
          © {new Date().getFullYear()} طبيبي. جميع الحقوق محفوظة.
        </p>
      </div>
    </div>
  );
}

const THEME_EVENT = "tabibi-theme-change";

/** التعديل الجوهري: إجبار الوضع الغامق للطبيب والمركز الطبي */
function useEffectiveDark(
  theme: "light" | "dark",
  role: string | undefined
): boolean {
  // إذا كان طبيب أو مركز طبي، نستخدم الوضع الغامق دائماً بغض النظر عن ثيم النظام
  if (role === "DOCTOR" || role === "MEDICAL_CENTER_ADMIN") return true;
  return theme === "dark";
}

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [doctorInfo, setDoctorInfo] = useState<{ status: string | null; specialty: string | null }>({ status: null, specialty: null });

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("tabibi-theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initial = stored === "dark" || (!stored && prefersDark) ? "dark" : "light";
      setTheme(initial);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const handler = (e: CustomEvent<"light" | "dark">) => setTheme(e.detail);
    window.addEventListener(THEME_EVENT, handler as EventListener);
    return () => window.removeEventListener(THEME_EVENT, handler as EventListener);
  }, []);

  const role = session?.user?.role;
  const effectiveDark = useEffectiveDark(theme, role);

  useEffect(() => {
    if (role !== "DOCTOR") return;
    fetch("/api/doctor/profile")
      .then((r) => r.json())
      .then((data) => setDoctorInfo({
        status: data?.doctor?.status ?? null,
        specialty: data?.doctor?.specialty?.nameAr ?? null,
      }))
      .catch(() => setDoctorInfo({ status: null, specialty: null }));
  }, [role]);

  const sections =
    role === "DOCTOR"
      ? doctorInfo.status === "REJECTED" || doctorInfo.status === "PENDING"
        ? doctorSectionsLimited
        : doctorSectionsFull
      : role === "MEDICAL_CENTER_ADMIN"
        ? medicalCenterSections
        : role === "PLATFORM_ADMIN" || role === "CLINIC_ADMIN"
          ? adminSections
          : patientSections;

  const roleLabel =
    role === "DOCTOR"
      ? "طبيب"
      : role === "PLATFORM_ADMIN"
        ? "مشرف المنصة"
        : role === "CLINIC_ADMIN"
          ? "مشرف عيادة"
          : role === "MEDICAL_CENTER_ADMIN"
            ? "مركز طبي"
            : "مريض";

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col w-60 min-h-screen shrink-0 border-l transition-colors duration-300",
          effectiveDark ? "bg-gray-900 border-gray-800" : "bg-slate-100 border-slate-200 shadow-sm"
        )}
      >
        <SidebarContent
          sections={sections}
          roleLabel={roleLabel}
          pathname={pathname}
          onLinkClick={() => setMobileOpen(false)}
          isDark={effectiveDark}
          userRole={role}
          userName={session?.user?.name}
          userImage={session?.user?.image ?? null}
          doctorSpecialty={doctorInfo.specialty}
        />
      </aside>

      {/* Mobile Top Bar */}
      <div
        className={cn(
          "lg:hidden fixed top-0 right-0 left-0 z-40 border-b px-4 h-14 flex items-center justify-between transition-colors duration-300",
          effectiveDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200 shadow-sm"
        )}
      >
        <div className={cn("flex items-center gap-2 font-bold text-sm min-w-0")}>
          <Image
            src="/88e178c9-facc-41a2-8f98-9252ccce19ee.png"
            alt="Tabibi"
            width={200}
            height={50}
            className="h-16 w-auto max-w-[200px] brightness-125"
          />
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            effectiveDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:bg-gray-100"
          )}
          aria-label={mobileOpen ? "إغلاق القائمة" : "فتح القائمة"}
        >
          {mobileOpen ? <IconXCircle className="h-6 w-6" /> : <IconMenuWidgets className="h-6 w-6" />}
        </button>
      </div>

      {/* Backdrop */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-hidden />
      )}

      {/* Mobile Sidebar (Drawer) */}
      <aside
        className={cn(
          "lg:hidden fixed top-14 right-0 bottom-0 z-40 w-64 border-l transition-transform duration-300 ease-in-out",
          effectiveDark ? "bg-gray-900 border-gray-800 shadow-2xl shadow-black" : "bg-white border-gray-200 shadow-lg",
          mobileOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <SidebarContent
          sections={sections}
          roleLabel={roleLabel}
          pathname={pathname}
          onLinkClick={() => setMobileOpen(false)}
          isDark={effectiveDark}
          userRole={role}
          userName={session?.user?.name}
          userImage={session?.user?.image ?? null}
          doctorSpecialty={doctorInfo.specialty}
        />
      </aside>
    </>
  );
}