"use client";

import Link from "next/link";
import IconHeart from "@/components/icon/icon-heart";
import IconBuilding from "@/components/icon/icon-building";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  return (
    <Card className="w-full max-w-4xl shadow-xl border-0 overflow-hidden">
      <CardHeader className="text-center pb-1">
        <CardTitle className="text-2xl font-bold text-gray-900">إنشاء حساب جديد</CardTitle>
        <CardDescription className="text-sm text-gray-500">اختر نوع حسابك</CardDescription>
      </CardHeader>
      <CardContent className="pt-4 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/register/patient"
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
            <span className="relative text-center text-xs text-emerald-700/80 dark:text-emerald-300/90">احجز مواعيدك بسهولة</span>
          </Link>
          <Link
            href="/register/doctor"
            className={cn(
              "group relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50 p-6",
              "transition-all duration-300 hover:border-violet-400 hover:shadow-lg hover:shadow-violet-100/50",
              "dark:border-violet-800/80 dark:from-violet-950/70 dark:to-purple-950/70 dark:hover:border-violet-500 dark:hover:shadow-violet-900/40",
            )}
          >
            <div className="absolute bottom-0 right-0 h-20 w-20 translate-x-1/2 translate-y-1/2 rounded-full bg-violet-200/40 transition-transform group-hover:scale-110 dark:bg-violet-500/20" />
            <div className="relative rounded-2xl border border-violet-100 bg-white/80 p-4 shadow-sm transition-transform group-hover:scale-105 dark:border-violet-800 dark:bg-slate-800/90">
              <IconHeart className="h-10 w-10 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="relative text-lg font-bold text-gray-800 dark:text-slate-100">طبيب</span>
            <span className="relative text-center text-xs text-violet-700/80 dark:text-violet-300/90">انضم لشبكة طبيبي</span>
          </Link>
          <Link
            href="/register/medical-center"
            className={cn(
              "group relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-sky-100 bg-gradient-to-br from-sky-50 to-blue-50 p-6 sm:col-span-1",
              "transition-all duration-300 hover:border-sky-400 hover:shadow-lg hover:shadow-sky-100/50",
              "dark:border-sky-800/80 dark:from-sky-950/70 dark:to-blue-950/70 dark:hover:border-sky-500 dark:hover:shadow-sky-900/40",
            )}
          >
            <div className="relative rounded-2xl border border-sky-100 bg-white/80 p-4 shadow-sm transition-transform group-hover:scale-105 dark:border-sky-800 dark:bg-slate-800/90">
              <IconBuilding className="h-10 w-10 text-sky-600 dark:text-sky-400" />
            </div>
            <span className="relative text-lg font-bold text-gray-800 dark:text-slate-100">مركز طبي</span>
            <span className="relative text-center text-xs text-sky-700/80 dark:text-sky-300/90">لوحة إدارة المركز</span>
          </Link>
        </div>
        <div className="mt-6 border-t border-gray-100 pt-4 text-center dark:border-slate-700">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="font-semibold text-emerald-600 dark:text-emerald-400">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
