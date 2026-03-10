"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ROLE_STORAGE_KEY = "tabibi-user-role";

export function getStoredUserRole(): "patient" | "doctor" | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(ROLE_STORAGE_KEY);
  return v === "patient" || v === "doctor" ? v : null;
}

export function setStoredUserRole(role: "patient" | "doctor") {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ROLE_STORAGE_KEY, role);
  window.dispatchEvent(new Event("tabibi-role-changed"));
}

export default function RoleChoiceModal() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || pathname !== "/") return;
    const role = window.localStorage.getItem(ROLE_STORAGE_KEY);
    if (!role) setOpen(true);
  }, [mounted, pathname]);

  const handlePatient = () => {
    setStoredUserRole("patient");
    setOpen(false);
  };

  const handleDoctor = () => {
    setStoredUserRole("doctor");
    setOpen(false);
    router.push("/login/doctor");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="role-modal-title">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-right">
        <h2 id="role-modal-title" className="text-xl font-bold text-gray-900 mb-2 text-center">
          هل أنت مريض أم طبيب؟
        </h2>
        <p className="text-gray-500 text-sm mb-6 text-center">
          اختر نوع حسابك للمتابعة
        </p>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={handlePatient}
            className={cn(
              "p-5 rounded-xl border-2 text-right transition-all flex flex-col items-center gap-2",
              "border-blue-200 hover:border-blue-500 hover:bg-blue-50"
            )}
          >
            <div className="p-3 rounded-xl bg-blue-100">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <span className="font-semibold text-gray-800">مريض</span>
            <span className="text-xs text-gray-500">احجز مواعيد الأطباء</span>
          </button>
          <button
            type="button"
            onClick={handleDoctor}
            className={cn(
              "p-5 rounded-xl border-2 text-right transition-all flex flex-col items-center gap-2",
              "border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50"
            )}
          >
            <div className="p-3 rounded-xl bg-indigo-100">
              <Stethoscope className="h-8 w-8 text-indigo-600" />
            </div>
            <span className="font-semibold text-gray-800">طبيب</span>
            <span className="text-xs text-gray-500">استقبل المرضى</span>
          </button>
        </div>
      </div>
    </div>
  );
}
