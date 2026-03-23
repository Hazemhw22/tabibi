"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import IconCalendar from "@/components/icon/icon-calendar";
import IconPlusCircle from "@/components/icon/icon-plus-circle";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import QuickBookingModal from "@/components/medical-center/quick-booking-modal";
import { formatDateNumeric } from "@/lib/utils";

export default function CenterAppointmentsPage() {
  const [list, setList] = useState<unknown[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);

  const load = useCallback(() => {
    fetch("/api/medical-center/appointments")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setErr(j.error);
        else setList(j.appointments ?? []);
      })
      .catch(() => setErr("تعذر التحميل"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  type A = {
    id: string;
    appointmentDate: string;
    startTime: string;
    endTime: string;
    status: string;
    paymentStatus: string;
    fee?: number;
    patient?: { name?: string; phone?: string };
    doctor?: { user?: { name?: string }; specialty?: { nameAr?: string } };
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <Link href="/dashboard/medical-center" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
        ← الرئيسية
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <IconCalendar className="h-6 w-6 text-blue-600" />
          حجوزات المركز
        </h1>
        <Button
          type="button"
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md"
          onClick={() => setQuickOpen(true)}
        >
          <IconPlusCircle className="h-4 w-4" />
          إضافة حجز
        </Button>
      </div>

      <QuickBookingModal open={quickOpen} onOpenChange={setQuickOpen} onBooked={load} />

      {err && <p className="text-red-600 text-sm mb-4">{err}</p>}

      {list.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="py-12 text-center text-gray-500 space-y-4">
            <p>لا توجد حجوزات بعد.</p>
            <Button type="button" variant="outline" className="gap-2" onClick={() => setQuickOpen(true)}>
              <IconPlusCircle className="h-4 w-4" />
              إضافة حجز سريع
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-right p-2 w-14">تسلسل</th>
                <th className="text-right p-2">التاريخ</th>
                <th className="text-right p-2">المريض</th>
                <th className="text-right p-2">الطبيب</th>
                <th className="text-right p-2">الحالة</th>
                <th className="text-right p-2">الدفع</th>
                <th className="text-right p-2">السعر</th>
              </tr>
            </thead>
            <tbody>
              {(list as A[]).map((a, i) => (
                <tr key={a.id} className="border-b">
                  <td className="p-2 text-center font-semibold tabular-nums text-gray-700">{i + 1}</td>
                  <td className="p-2 whitespace-nowrap">
                    {formatDateNumeric(a.appointmentDate)} {a.startTime}
                  </td>
                  <td className="p-2">{a.patient?.name}</td>
                  <td className="p-2">
                    {a.doctor?.user?.name} — {a.doctor?.specialty?.nameAr}
                  </td>
                  <td className="p-2">
                    <Badge variant="secondary">{a.status}</Badge>
                  </td>
                  <td className="p-2">{a.paymentStatus}</td>
                  <td className="p-2 whitespace-nowrap">₪{a.fee ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
