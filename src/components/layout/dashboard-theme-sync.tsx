"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { applyTabibiTheme } from "@/lib/tabibi-theme";

/**
 * للطبيب ومدير المركز: افتراضي داكن عند أول زيارة (بدون تفضيل محفوظ)، مع احترام اختيار المستخدم لاحقاً.
 */
export function DashboardThemeSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    const role = session?.user?.role;
    if (role !== "DOCTOR" && role !== "MEDICAL_CENTER_ADMIN") return;
    try {
      const stored = window.localStorage.getItem("tabibi-theme");
      if (stored === "light" || stored === "dark") {
        applyTabibiTheme(stored);
        return;
      }
      applyTabibiTheme("dark");
    } catch {
      /* ignore */
    }
  }, [status, session?.user?.role]);

  return null;
}
