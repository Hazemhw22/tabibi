"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import IconHome from "@/components/icon/icon-home";
import IconHeart from "@/components/icon/icon-heart";
import IconSearch from "@/components/icon/icon-search";
import IconCalendar from "@/components/icon/icon-calendar";
import IconUser from "@/components/icon/icon-user";

const NAV_ITEMS = [
  { href: "/", icon: IconHome, label: "الرئيسية" },
  { href: "/favorites", icon: IconHeart, label: "المفضلة" },
  { href: "/doctors", icon: IconSearch, label: "أطباء" },
  { href: "/dashboard/patient/appointments", icon: IconCalendar, label: "مواعيدي" },
  { href: "/profile", icon: IconUser, label: "حسابي" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 sm:hidden safe-area-pb">
      <div className="flex items-center justify-around py-1.5 pb-safe">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[56px] ${
                active ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <div className={`relative flex items-center justify-center w-7 h-7 rounded-xl transition-all ${active ? "bg-blue-50" : ""}`}>
                <Icon
                  className={`h-5 w-5 transition-all ${
                    active ? "text-blue-600" : ""
                  }`}
                />
              </div>
              <span className={`text-[10px] font-medium leading-none ${active ? "text-blue-600" : ""}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
