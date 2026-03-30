"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useMemo } from "react";
import { useTabibiTheme } from "@/lib/tabibi-theme";
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
import IconSend from "@/components/icon/icon-send";
import IconArchive from "@/components/icon/icon-archive";
import IconShoppingBag from "@/components/icon/icon-shopping-bag";
import { getDoctorAvatar, getPatientAvatar } from "@/lib/avatar";
import { DOCTOR_STAFF_ROLE_LABELS, isDoctorStaffRole } from "@/lib/doctor-team-roles";
import NotificationBell from "@/components/notifications/notification-bell";
import { DashboardUserMenu } from "@/components/layout/dashboard-user-menu";
import { doctorMarketplaceNavVisibility } from "@/lib/marketplace-specialties";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

type NavSection = { title: string; items: NavItem[] };

const doctorMarketplaceOfferItem: NavItem = { label: "العروضات", href: "/dashboard/doctor/offers", icon: IconFire };
const doctorMarketplaceProductItem: NavItem = { label: "المنتجات", href: "/dashboard/doctor/products", icon: IconShoppingBag };

/** يخفي قسم المتجر بالكامل إن لم يكن أي رابط مسموحاً؛ طبيب أسنان: عروض فقط بدون منتجات */
function filterDoctorSectionsForMarketplace(sections: NavSection[], specialtyNameAr: string | null): NavSection[] {
  const { offers, products } = doctorMarketplaceNavVisibility(specialtyNameAr);
  return sections
    .map((section) => {
      if (section.title !== "المتجر") return section;
      const items: NavItem[] = [];
      if (offers) items.push(doctorMarketplaceOfferItem);
      if (products) items.push(doctorMarketplaceProductItem);
      return { title: "المتجر", items };
    })
    .filter((section) => section.title !== "المتجر" || section.items.length > 0);
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
    title: "الرسائل",
    items: [
      { label: "إرسال", href: "/dashboard/doctor/messages/send", icon: IconSend },
      { label: "سجل", href: "/dashboard/doctor/messages/history", icon: IconArchive },
    ],
  },
  {
    title: "العيادة",
    items: [
      { label: "التقارير", href: "/dashboard/doctor/reports", icon: IconBarChart },
      { label: "العيادات والمواعيد", href: "/dashboard/doctor/clinics", icon: IconClipboardText },
      { label: "موظفين العيادة", href: "/dashboard/doctor/staff", icon: IconMenuUsers },
      { label: "مزوّدون المستلزمات", href: "/dashboard/doctor/suppliers", icon: IconShoppingBag },
      { label: "مصروفات العيادة", href: "/dashboard/doctor/expenses", icon: IconDollarSignCircle },
    ],
  },
  {
    title: "المتجر",
    items: [doctorMarketplaceOfferItem, doctorMarketplaceProductItem],
  },
  {
    title: "الإعدادات",
    items: [{ label: "الإعدادات", href: "/dashboard/doctor/settings", icon: IconSettings }],
  },
];

const doctorSectionsLimited: NavSection[] = [
  { title: "الرئيسية", items: [{ label: "الرئيسية", href: "/dashboard/doctor", icon: IconMenuDashboard }] },
];

/** موظفين الطبيب: مواعيد + مرضى فقط */
const doctorSectionsStaff: NavSection[] = [
  {
    title: "الرئيسية",
    items: [
      { label: "المواعيد", href: "/dashboard/doctor/appointments", icon: IconCalendar },
      { label: "المرضى", href: "/dashboard/doctor/patients", icon: IconUsersGroup },
    ],
  },
];

const adminSections: NavSection[] = [
  {
    title: "الرئيسية",
    items: [
      { label: "لوحة تحكم", href: "/dashboard/admin", icon: IconMenuDashboard },
      { label: "الأطباء", href: "/dashboard/admin/doctors", icon: IconMenuUsers },
      { label: "المراكز الطبية", href: "/dashboard/admin/medical-centers", icon: IconBuilding },
      { label: "المستخدمون", href: "/dashboard/admin/users", icon: IconUsersGroup },
    ],
  },
  {
    title: "الرسائل",
    items: [
      { label: "إرسال", href: "/dashboard/admin/messages/send", icon: IconSend },
      { label: "السجل", href: "/dashboard/admin/messages/history", icon: IconArchive },
      { label: "الإعدادات", href: "/dashboard/admin/messages/settings", icon: IconSettings },
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

const medicalCenterSectionsAdmin: NavSection[] = [
  {
    title: "الرئيسية",
    items: [
      { label: "الرئيسية", href: "/dashboard/medical-center", icon: IconMenuDashboard },
      { label: "الأطباء", href: "/dashboard/medical-center/doctors", icon: IconMenuUsers },
      { label: "الموظفون", href: "/dashboard/medical-center/staff", icon: IconMenuUsers },
      { label: "المرضى", href: "/dashboard/medical-center/patients", icon: IconUsersGroup },
      { label: "الحجوزات", href: "/dashboard/medical-center/appointments", icon: IconCalendar },
      { label: "التحاليل والأشعة", href: "/dashboard/medical-center/lab-results", icon: IconClipboardText },
      { label: "الحسابات", href: "/dashboard/medical-center/finance", icon: IconDollarSignCircle },
    ],
  },
  {
    title: "الرسائل",
    items: [
      { label: "إرسال", href: "/dashboard/medical-center/messages/send", icon: IconSend },
      { label: "السجل", href: "/dashboard/medical-center/messages/history", icon: IconArchive },
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

const medicalCenterSectionsReception: NavSection[] = [
  {
    title: "الرئيسية",
    items: [
      { label: "الرئيسية", href: "/dashboard/medical-center", icon: IconMenuDashboard },
      { label: "المرضى", href: "/dashboard/medical-center/patients", icon: IconUsersGroup },
      { label: "الحجوزات", href: "/dashboard/medical-center/appointments", icon: IconCalendar },
    ],
  },
  {
    title: "الرسائل",
    items: [
      { label: "إرسال", href: "/dashboard/medical-center/messages/send", icon: IconSend },
      { label: "السجل", href: "/dashboard/medical-center/messages/history", icon: IconArchive },
    ],
  },
  {
    title: "الخدمات",
    items: [{ label: "الطوارئ", href: "/dashboard/medical-center/emergency", icon: IconFire }],
  },
];

const medicalCenterSectionsLab: NavSection[] = [
  {
    title: "الرئيسية",
    items: [
      { label: "الرئيسية", href: "/dashboard/medical-center", icon: IconMenuDashboard },
      { label: "المرضى", href: "/dashboard/medical-center/patients", icon: IconUsersGroup },
      { label: "التحاليل والأشعة", href: "/dashboard/medical-center/lab-results", icon: IconClipboardText },
    ],
  },
  {
    title: "الرسائل",
    items: [
      { label: "إرسال", href: "/dashboard/medical-center/messages/send", icon: IconSend },
      { label: "السجل", href: "/dashboard/medical-center/messages/history", icon: IconArchive },
    ],
  },
];

function medicalCenterNavForRole(role: string | undefined): NavSection[] {
  switch (role) {
    case "MEDICAL_CENTER_ADMIN":
      return medicalCenterSectionsAdmin;
    case "MEDICAL_CENTER_RECEPTIONIST":
      return medicalCenterSectionsReception;
    case "MEDICAL_CENTER_LAB_STAFF":
      return medicalCenterSectionsLab;
    default:
      return medicalCenterSectionsAdmin;
  }
}

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
  /** شريط ضيق بالأيقونات فقط بين lg وxl (آيباد أفقي)، والعرض الكامل من xl فما فوق */
  desktopRail?: boolean;
  userRole?: string;
  userName?: string | null;
  userImage?: string | null;
  userGender?: string | null;
  doctorSpecialty?: string | null;
  centerImage?: string | null;
  centerName?: string | null;
}

function SidebarContent({
  sections,
  roleLabel,
  pathname,
  onLinkClick,
  isDark,
  desktopRail = false,
  userRole,
  userName,
  userImage,
  userGender,
  doctorSpecialty,
  centerImage,
  centerName,
}: SidebarContentProps) {
  const linkClass = (item: NavItem, isActive: boolean) => {
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onLinkClick}
        title={desktopRail ? item.label : undefined}
        className={cn(
          "flex items-center gap-3 rounded-xl text-sm font-medium transition-all",
          desktopRail ? "justify-center px-2 py-2.5 xl:justify-start xl:px-3" : "px-3 py-2.5",
          isActive
            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
            : isDark
              ? "text-gray-400 hover:text-white hover:bg-gray-800"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        )}
      >
        <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : isDark ? "text-gray-400" : "text-gray-500")} />
        <span className={cn(desktopRail && "hidden xl:inline")}>{item.label}</span>
        {item.badge && (
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white",
              desktopRail ? "hidden xl:mr-auto xl:flex" : "mr-auto"
            )}
          >
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

  // تحديد الصورة والاسم حسب الدور
  const profileImage = (() => {
    if (userRole === "DOCTOR") return getDoctorAvatar(userImage, userGender);
    if (userRole === "MEDICAL_CENTER_ADMIN") return centerImage || null;
    if (userRole === "MEDICAL_CENTER_RECEPTIONIST" || userRole === "MEDICAL_CENTER_LAB_STAFF") {
      return userImage || null;
    }
    return getPatientAvatar(userImage, userGender);
  })();
  const profileName =
    userRole === "MEDICAL_CENTER_ADMIN" ? (centerName || userName) : userName;
  const profileSubtitle =
    userRole === "DOCTOR" ? (doctorSpecialty ?? "طبيب") :
    userRole === "MEDICAL_CENTER_ADMIN" ? "مركز طبي" :
    userRole === "MEDICAL_CENTER_RECEPTIONIST" ? "استقبال" :
    userRole === "MEDICAL_CENTER_LAB_STAFF" ? "مختبر / أشعة" :
    userRole === "DOCTOR_RECEPTION" || userRole === "DOCTOR_ASSISTANT"
      ? (DOCTOR_STAFF_ROLE_LABELS[userRole] ?? "موظف عيادة") :
    userRole === "PLATFORM_ADMIN" || userRole === "CLINIC_ADMIN" ? "مشرف" :
    "مريض";

  return (
    <div className="flex flex-col h-full">
      {/* Header: Profile card for all roles */}
      <div
        className={cn(
          "border-b pt-5 pb-4",
          desktopRail ? "px-2 pt-4 xl:px-4" : "px-4",
          isDark ? "border-gray-800" : "border-gray-200"
        )}
      >
        {/* Avatar + name */}
        <div className={cn("flex items-center gap-3", desktopRail && "flex-col xl:flex-row")}>
          <div className="shrink-0 h-12 w-12 rounded-xl overflow-hidden border-2 border-blue-500/40 bg-blue-900 flex items-center justify-center">
            {profileImage ? (
              <Image
                src={profileImage}
                alt={profileName ?? "مستخدم"}
                width={48}
                height={48}
                className="object-cover object-top w-full h-full"
                unoptimized
              />
            ) : (
              <span className="text-xl">
                {userRole === "DOCTOR"
                  ? "👨‍⚕️"
                  : userRole === "MEDICAL_CENTER_ADMIN"
                    ? "🏥"
                    : userRole === "MEDICAL_CENTER_RECEPTIONIST" || userRole === "DOCTOR_RECEPTION" || userRole === "DOCTOR_ASSISTANT"
                      ? "📋"
                      : userRole === "MEDICAL_CENTER_LAB_STAFF"
                        ? "🔬"
                        : "👤"}
              </span>
            )}
          </div>
          <div
            className={cn(
              "min-w-0",
              desktopRail ? "hidden text-center xl:block xl:flex-1 xl:text-right" : "flex-1"
            )}
          >
            <p className={cn("text-sm font-bold truncate leading-tight", isDark ? "text-white" : "text-gray-900")}>
              {userRole === "DOCTOR" ? `د. ${profileName}` : profileName}
            </p>
            <p className={cn("mt-0.5 truncate text-xs", isDark ? "text-blue-400" : "text-blue-600")}>
              {profileSubtitle}
            </p>
          </div>
        </div>
      </div>

      <nav className={cn("flex-1 space-y-6 overflow-y-auto py-4", desktopRail ? "px-1.5 xl:px-3" : "px-3")}>
        {sections.map((section) => (
          <div key={section.title}>
            <p
              className={cn(
                "mb-2 px-3 text-[10px] font-bold uppercase tracking-wider",
                desktopRail && "hidden xl:block",
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

      

      <div
        className={cn(
          "shrink-0 border-t px-5 py-3 text-center",
          desktopRail && "hidden xl:block",
          isDark ? "border-gray-800" : "border-gray-200"
        )}
      >
        <p className={cn("text-[11px]", isDark ? "text-gray-300" : "text-gray-400")}>
          © {new Date().getFullYear()} طبيبي. جميع الحقوق محفوظة.
        </p>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [doctorInfo, setDoctorInfo] = useState<{ status: string | null; specialty: string | null; image: string | null; gender: string | null }>({ status: null, specialty: null, image: null, gender: null });
  const [doctorProfileResolved, setDoctorProfileResolved] = useState(false);
  const [centerInfo, setCenterInfo] = useState<{ image: string | null; name: string | null }>({ image: null, name: null });
  const [patientInfo, setPatientInfo] = useState<{ image: string | null; gender: string | null }>({ image: null, gender: null });

  const role = session?.user?.role;
  const theme = useTabibiTheme();
  const effectiveDark = theme === "dark";

  useEffect(() => {
    if (role === "DOCTOR") {
      setDoctorProfileResolved(false);
      fetch("/api/doctor/profile")
        .then((r) => r.json())
        .then((data) => setDoctorInfo({
          status: data?.doctor?.status ?? null,
          specialty: data?.doctor?.specialty?.nameAr ?? null,
          image: data?.doctor?.user?.image ?? null,
          gender: data?.doctor?.gender ?? null,
        }))
        .catch(() => setDoctorInfo({ status: null, specialty: null, image: null, gender: null }))
        .finally(() => setDoctorProfileResolved(true));
    } else if (
      role === "MEDICAL_CENTER_ADMIN" ||
      role === "MEDICAL_CENTER_RECEPTIONIST" ||
      role === "MEDICAL_CENTER_LAB_STAFF"
    ) {
      fetch("/api/medical-center/settings")
        .then((r) => r.json())
        .then((data) => setCenterInfo({
          image: data?.center?.imageUrl ?? null,
          name: data?.center?.nameAr ?? data?.center?.name ?? null,
        }))
        .catch(() => setCenterInfo({ image: null, name: null }));
    } else if (role === "PATIENT") {
      fetch("/api/profile/me")
        .then((r) => r.json())
        .then((data) => setPatientInfo({
          image: data?.image ?? null,
          gender: data?.gender ?? null,
        }))
        .catch(() => setPatientInfo({ image: null, gender: null }));
    } else {
      setDoctorProfileResolved(false);
    }
  }, [role]);

  const sections = useMemo(() => {
    if (role === "DOCTOR") {
      if (doctorInfo.status === "REJECTED" || doctorInfo.status === "PENDING") {
        return doctorSectionsLimited;
      }
      if (!doctorProfileResolved) {
        return doctorSectionsFull;
      }
      return filterDoctorSectionsForMarketplace(doctorSectionsFull, doctorInfo.specialty);
    }
    if (isDoctorStaffRole(role)) return doctorSectionsStaff;
    if (
      role === "MEDICAL_CENTER_ADMIN" ||
      role === "MEDICAL_CENTER_RECEPTIONIST" ||
      role === "MEDICAL_CENTER_LAB_STAFF"
    ) {
      return medicalCenterNavForRole(role);
    }
    if (role === "PLATFORM_ADMIN" || role === "CLINIC_ADMIN") return adminSections;
    return patientSections;
  }, [role, doctorInfo.status, doctorInfo.specialty, doctorProfileResolved]);

  const roleLabel =
    role === "DOCTOR"
      ? "طبيب"
      : role === "DOCTOR_RECEPTION" || role === "DOCTOR_ASSISTANT"
        ? (DOCTOR_STAFF_ROLE_LABELS[role ?? ""] ?? "موظف عيادة")
      : role === "PLATFORM_ADMIN"
        ? "مشرف المنصة"
        : role === "CLINIC_ADMIN"
          ? "مشرف عيادة"
          : role === "MEDICAL_CENTER_ADMIN"
            ? "مركز طبي"
            : role === "MEDICAL_CENTER_RECEPTIONIST"
              ? "استقبال"
              : role === "MEDICAL_CENTER_LAB_STAFF"
                ? "مختبر / أشعة"
                : "مريض";

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden min-h-screen shrink-0 flex-col border-l transition-[width] duration-300 ease-out lg:flex lg:w-[4.5rem] xl:w-60",
          effectiveDark ? "bg-gray-900 border-gray-800" : "bg-slate-100 border-slate-200 shadow-sm"
        )}
      >
        <SidebarContent
          desktopRail
          sections={sections}
          roleLabel={roleLabel}
          pathname={pathname}
          onLinkClick={() => setMobileOpen(false)}
          isDark={effectiveDark}
          userRole={role}
          userName={session?.user?.name}
          userImage={
            role === "DOCTOR"
              ? doctorInfo.image
              : role === "PATIENT"
                ? patientInfo.image
                : role === "MEDICAL_CENTER_ADMIN"
                  ? (centerInfo.image ?? session?.user?.image ?? null)
                  : session?.user?.image ?? null
          }
          userGender={role === "DOCTOR" ? doctorInfo.gender : role === "PATIENT" ? patientInfo.gender : null}
          doctorSpecialty={doctorInfo.specialty}
          centerImage={centerInfo.image}
          centerName={centerInfo.name}
        />
      </aside>

      {/* Mobile Top Bar: شعار + إشعارات + حساب + فتح السايدبار في صف واحد */}
      <div
        className={cn(
          "lg:hidden fixed right-0 left-0 top-0 z-40 flex h-14 items-center justify-between gap-2 border-b px-2 pt-[env(safe-area-inset-top)] transition-colors duration-300",
          effectiveDark ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white shadow-sm"
        )}
      >
        <div className="flex min-w-0 flex-1 items-center">
          <Image
            src="/88e178c9-facc-41a2-8f98-9252ccce19ee.png"
            alt="Tabibi"
            width={200}
            height={50}
            className="h-8 w-auto max-w-[min(160px,42vw)] brightness-125"
          />
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <NotificationBell theme={effectiveDark ? "dark" : "light"} />
          <DashboardUserMenu isDark={effectiveDark} compact />
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className={cn(
              "rounded-lg p-1.5 transition-colors",
              effectiveDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:bg-gray-100"
            )}
            aria-label={mobileOpen ? "إغلاق القائمة" : "فتح القائمة"}
          >
            {mobileOpen ? <IconXCircle className="h-6 w-6" /> : <IconMenuWidgets className="h-6 w-6" />}
          </button>
        </div>
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
          userImage={
            role === "DOCTOR"
              ? doctorInfo.image
              : role === "PATIENT"
                ? patientInfo.image
                : role === "MEDICAL_CENTER_ADMIN"
                  ? (centerInfo.image ?? session?.user?.image ?? null)
                  : session?.user?.image ?? null
          }
          userGender={role === "DOCTOR" ? doctorInfo.gender : role === "PATIENT" ? patientInfo.gender : null}
          doctorSpecialty={doctorInfo.specialty}
          centerImage={centerInfo.image}
          centerName={centerInfo.name}
        />
      </aside>
    </>
  );
}