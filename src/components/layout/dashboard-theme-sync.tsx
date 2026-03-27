"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

const THEME_EVENT = "tabibi-theme-change";

/**
 * السايدبار والهيدر يفرضان مظهرًا داكنًا للطبيب ومدير المركز، بينما قواعد globals.css
 * تعتمد على html[data-theme="dark"]. بدون المزامنة يبقى المحتوى فاتحًا والثيم غير متسق.
 */
export function DashboardThemeSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    const role = session?.user?.role;
    if (role !== "DOCTOR" && role !== "MEDICAL_CENTER_ADMIN") return;
    try {
      document.documentElement.dataset.theme = "dark";
      window.localStorage.setItem("tabibi-theme", "dark");
      window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: "dark" }));
    } catch {
      /* ignore */
    }
  }, [status, session?.user?.role]);

  return null;
}
