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
              "group relative overflow-hidden rounded-2xl p-6 flex flex-col items-center justify-center gap-3",
              "bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-100",
              "hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-100/50 transition-all duration-300"
            )}
          >
            <div className="absolute top-0 left-0 w-20 h-20 rounded-full bg-emerald-200/40 -translate-x-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform" />
            <div className="relative p-4 rounded-2xl bg-white/80 shadow-sm border border-emerald-100 group-hover:scale-105 transition-transform">
              <IconHeart className="h-10 w-10 text-emerald-600" />
            </div>
            <span className="relative text-lg font-bold text-gray-800">مريض</span>
            <span className="relative text-xs text-emerald-700/80 text-center">احجز مواعيدك بسهولة</span>
          </Link>
          <Link
            href="/register/doctor"
            className={cn(
              "group relative overflow-hidden rounded-2xl p-6 flex flex-col items-center justify-center gap-3",
              "bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-100",
              "hover:border-violet-400 hover:shadow-lg hover:shadow-violet-100/50 transition-all duration-300"
            )}
          >
            <div className="absolute bottom-0 right-0 w-20 h-20 rounded-full bg-violet-200/40 translate-x-1/2 translate-y-1/2 group-hover:scale-110 transition-transform" />
            <div className="relative p-4 rounded-2xl bg-white/80 shadow-sm border border-violet-100 group-hover:scale-105 transition-transform">
              <IconHeart className="h-10 w-10 text-violet-600" />
            </div>
            <span className="relative text-lg font-bold text-gray-800">طبيب</span>
            <span className="relative text-xs text-violet-700/80 text-center">انضم لشبكة طبيبي</span>
          </Link>
          <Link
            href="/register/medical-center"
            className={cn(
              "group relative overflow-hidden rounded-2xl p-6 flex flex-col items-center justify-center gap-3",
              "bg-gradient-to-br from-sky-50 to-blue-50 border-2 border-sky-100",
              "hover:border-sky-400 hover:shadow-lg hover:shadow-sky-100/50 transition-all duration-300 sm:col-span-1"
            )}
          >
            <div className="relative p-4 rounded-2xl bg-white/80 shadow-sm border border-sky-100 group-hover:scale-105 transition-transform">
              <IconBuilding className="h-10 w-10 text-sky-600" />
            </div>
            <span className="relative text-lg font-bold text-gray-800">مركز طبي</span>
            <span className="relative text-xs text-sky-700/80 text-center">لوحة إدارة المركز</span>
          </Link>
        </div>
        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="text-emerald-600 font-semibold hover:underline">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
