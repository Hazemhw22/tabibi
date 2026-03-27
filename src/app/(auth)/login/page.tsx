"use client";

import { Suspense } from "react";
import Link from "next/link";
import IconHeart from "@/components/icon/icon-heart";
import IconClipboardText from "@/components/icon/icon-clipboard-text";
import IconBuilding from "@/components/icon/icon-building";
import IconInfoCircle from "@/components/icon/icon-info-circle";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

function LoginCard() {
  const searchParams = useSearchParams();
  const rateLimited = searchParams.get("error") === "rate_limited";

  return (
    <Card className="w-full max-w-4xl shadow-xl border-0 overflow-hidden">
      {rateLimited && (
        <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-200">
          <IconInfoCircle className="h-4 w-4 shrink-0" />
          <span>تم تجاوز الحد المسموح من المحاولات. يرجى المحاولة مرة أخرى بعد 15 دقيقة.</span>
        </div>
      )}
      <CardHeader className="text-center pb-1">
        <CardTitle className="text-2xl font-bold text-gray-900">تسجيل الدخول</CardTitle>
        <CardDescription className="text-sm text-gray-500">اختر نوع حسابك</CardDescription>
      </CardHeader>
      <CardContent className="pt-4 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/login/patient"
            className={cn(
              "group relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-6",
              "transition-all duration-300 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-100/50",
              "dark:border-emerald-800/80 dark:from-emerald-950/70 dark:to-teal-950/70 dark:hover:border-emerald-500 dark:hover:shadow-emerald-900/40",
            )}
          >
            <div className="absolute left-0 top-0 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-200/40 transition-transform group-hover:scale-110 dark:bg-emerald-500/20" />
            <div className="relative rounded-2xl border border-emerald-100 bg-white/80 p-4 shadow-sm transition-transform group-hover:scale-105 dark:border-emerald-800 dark:bg-slate-800/90">
              <IconHeart className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="relative text-lg font-bold text-gray-800 dark:text-slate-100">مريض</span>
            <span className="relative text-center text-xs text-emerald-700/80 dark:text-emerald-300/90">مواعيدك وحسابك</span>
          </Link>
          <Link
            href="/login/doctor"
            className={cn(
              "group relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50 p-6",
              "transition-all duration-300 hover:border-violet-400 hover:shadow-lg hover:shadow-violet-100/50",
              "dark:border-violet-800/80 dark:from-violet-950/70 dark:to-purple-950/70 dark:hover:border-violet-500 dark:hover:shadow-violet-900/40",
            )}
          >
            <div className="absolute bottom-0 right-0 h-20 w-20 translate-x-1/2 translate-y-1/2 rounded-full bg-violet-200/40 transition-transform group-hover:scale-110 dark:bg-violet-500/20" />
            <div className="relative rounded-2xl border border-violet-100 bg-white/80 p-4 shadow-sm transition-transform group-hover:scale-105 dark:border-violet-800 dark:bg-slate-800/90">
              <IconClipboardText className="h-10 w-10 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="relative text-lg font-bold text-gray-800 dark:text-slate-100">طبيب</span>
            <span className="relative text-center text-xs text-violet-700/80 dark:text-violet-300/90">لوحة التحكم</span>
          </Link>
          <Link
            href="/login/medical-center"
            className={cn(
              "group relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-sky-100 bg-gradient-to-br from-sky-50 to-blue-50 p-6",
              "transition-all duration-300 hover:border-sky-400 hover:shadow-lg hover:shadow-sky-100/50",
              "dark:border-sky-800/80 dark:from-sky-950/70 dark:to-blue-950/70 dark:hover:border-sky-500 dark:hover:shadow-sky-900/40",
            )}
          >
            <div className="relative rounded-2xl border border-sky-100 bg-white/80 p-4 shadow-sm transition-transform group-hover:scale-105 dark:border-sky-800 dark:bg-slate-800/90">
              <IconBuilding className="h-10 w-10 text-sky-600 dark:text-sky-400" />
            </div>
            <span className="relative text-lg font-bold text-gray-800 dark:text-slate-100">مركز طبي</span>
            <span className="relative text-center text-xs text-sky-700/80 dark:text-sky-300/90">إدارة المركز</span>
          </Link>
        </div>
        <div className="mt-6 space-y-2 border-t border-gray-100 pt-4 text-center dark:border-slate-700">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            <Link href="/forgot-password" className="font-medium text-blue-600 dark:text-blue-400">
              نسيت كلمة المرور؟
            </Link>
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            ليس لديك حساب؟{" "}
            <Link href="/register" className="font-semibold text-emerald-600 dark:text-emerald-400">
              إنشاء حساب جديد
            </Link>
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            مركز طبي جديد؟{" "}
            <Link href="/register/medical-center" className="font-semibold text-sky-600 dark:text-sky-400">
              التسجيل كمركز طبي
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginCard />
    </Suspense>
  );
}
