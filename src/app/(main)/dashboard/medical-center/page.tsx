"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import IconUsers from "@/components/icon/icon-users";
import IconCalendar from "@/components/icon/icon-calendar";
import IconHeart from "@/components/icon/icon-heart";
import IconBell from "@/components/icon/icon-bell";
import IconBuilding from "@/components/icon/icon-building";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MEDICAL_CENTER_ANNUAL_FEE_NIS } from "@/lib/subscription-pricing";
import { formatDateNumeric } from "@/lib/utils";

type Overview = {
  center?: {
    name?: string;
    nameAr?: string;
    city?: string;
    address?: string;
    approvalStatus?: string;
    subscriptionEndDate?: string | null;
  };
  stats?: {
    doctorsCount: number;
    appointmentsCount: number;
    patientsCount: number;
    emergencyCount: number;
  };
};

export default function MedicalCenterDashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/medical-center/overview")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setErr(j.error);
        else setData(j);
      })
      .catch(() => setErr("تعذر التحميل"));
  }, []);

  const s = data?.stats;
  const c = data?.center;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <IconBuilding className="h-8 w-8 text-blue-600" />
          لوحة المركز الطبي
        </h1>
        {c && (
          <p className="text-gray-600 mt-1">
            {c.nameAr || c.name} — {c.city}
          </p>
        )}
      </div>

      {err && (
        <p className="text-red-600 text-sm mb-4">{err}</p>
      )}

      {c && c.approvalStatus && c.approvalStatus !== "APPROVED" && (
        <div
          className={`mb-6 rounded-xl border p-4 text-sm ${
            c.approvalStatus === "REJECTED"
              ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100"
              : "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
          }`}
        >
          {c.approvalStatus === "PENDING" && (
            <>
              <p className="font-semibold">طلبك قيد المراجعة</p>
              <p className="mt-1 opacity-90">
                بعد موافقة مشرف المنصة على الاشتراك السنوي للمركز مع الأطباء ({MEDICAL_CENTER_ANNUAL_FEE_NIS}{" "}
                ₪ لمدة سنة) يُفعَّل حسابك بالكامل. ستصلك إشعاراً عند القبول.
              </p>
            </>
          )}
          {c.approvalStatus === "REJECTED" && (
            <>
              <p className="font-semibold">تم رفض طلب تسجيل المركز</p>
              <p className="mt-1 opacity-90">للاستفسار تواصل مع إدارة المنصة من صفحة الاتصال.</p>
            </>
          )}
        </div>
      )}

      {c?.approvalStatus === "APPROVED" && c.subscriptionEndDate && (
        <p className="text-xs text-gray-500 mb-4">
          اشتراك المركز السنوي ينتهي في:{" "}
          <span className="font-medium text-gray-700">{formatDateNumeric(c.subscriptionEndDate)}</span>
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <IconHeart className="h-4 w-4" />
              الأطباء
            </div>
            <div className="text-2xl font-bold mt-1">{s?.doctorsCount ?? "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <IconCalendar className="h-4 w-4" />
              الحجوزات
            </div>
            <div className="text-2xl font-bold mt-1">{s?.appointmentsCount ?? "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <IconUsers className="h-4 w-4" />
              المرضى (فريد)
            </div>
            <div className="text-2xl font-bold mt-1">{s?.patientsCount ?? "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <IconBell className="h-4 w-4" />
              طوارئ
            </div>
            <div className="text-2xl font-bold mt-1">{s?.emergencyCount ?? "—"}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/dashboard/medical-center/doctors">
          <Card className="hover:border-blue-300 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <IconHeart className="h-5 w-5 text-blue-600" />
                الأطباء وأوقات العمل
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              عرض الأطباء المرتبطين بالمركز وجداولهم
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/medical-center/patients">
          <Card className="hover:border-blue-300 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <IconUsers className="h-5 w-5 text-blue-600" />
                مرضى المركز
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              من حجزوا عبر المنصة
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/medical-center/appointments">
          <Card className="hover:border-blue-300 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <IconCalendar className="h-5 w-5 text-blue-600" />
                حجوزات المركز
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              جميع المواعيد لأطباء المركز
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/medical-center/emergency">
          <Card className="hover:border-amber-300 transition-colors cursor-pointer h-full border-amber-100 bg-amber-50/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <IconBell className="h-5 w-5 text-amber-600" />
                قسم الطوارئ
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              تسجيل حالات بدون حجز مسبق
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
