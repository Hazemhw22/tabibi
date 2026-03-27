"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import IconCalendar from "@/components/icon/icon-calendar";
import IconPlusCircle from "@/components/icon/icon-plus-circle";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import QuickBookingModal from "@/components/medical-center/quick-booking-modal";
import { formatDateNumeric, formatNumber } from "@/lib/utils";
import {
  DataTableShell,
  DataTable,
  DataTableHead,
  DataTableHeaderCell,
  DataTableBody,
  DataTableRow,
  DataTableCell,
  type TableViewMode,
} from "@/components/ui/data-table-shell";

export default function CenterAppointmentsPage() {
  const [list, setList] = useState<unknown[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<TableViewMode>("table");

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
    patient?: { id?: string; name?: string; phone?: string };
    doctor?: { user?: { name?: string }; specialty?: { nameAr?: string } };
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list as A[];
    return (list as A[]).filter((a) => {
      const p = a.patient?.name ?? "";
      const ph = a.patient?.phone ?? "";
      const d = a.doctor?.user?.name ?? "";
      return p.toLowerCase().includes(q) || ph.includes(q) || d.toLowerCase().includes(q);
    });
  }, [list, search]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <Link href="/dashboard/medical-center" className="text-sm text-blue-600 mb-4 inline-block">
        ← الرئيسية
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <IconCalendar className="h-6 w-6 text-blue-600" />
            حجوزات المركز
          </h1>
        
        </div>
        <Button
          type="button"
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md shrink-0 self-start"
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
        <DataTableShell
          searchPlaceholder="ابحث بالمريض أو الطبيب أو الهاتف..."
          searchQuery={search}
          onSearchChange={setSearch}
          summaryLabel="عدد الحجوزات"
          summaryValue={formatNumber(filtered.length, { maximumFractionDigits: 0 })}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        >
          {viewMode === "table" ? (
            <DataTable>
              <DataTableHead>
                <DataTableHeaderCell className="w-14">#</DataTableHeaderCell>
                <DataTableHeaderCell>التاريخ</DataTableHeaderCell>
                <DataTableHeaderCell>المريض</DataTableHeaderCell>
                <DataTableHeaderCell>الطبيب</DataTableHeaderCell>
                <DataTableHeaderCell>الحالة</DataTableHeaderCell>
                <DataTableHeaderCell>الدفع</DataTableHeaderCell>
                <DataTableHeaderCell>السعر</DataTableHeaderCell>
              </DataTableHead>
              <DataTableBody>
                {filtered.map((a, i) => (
                  <DataTableRow key={a.id}>
                    <DataTableCell className="text-center font-semibold tabular-nums">{i + 1}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap">{formatDateNumeric(a.appointmentDate)} {a.startTime}</DataTableCell>
                    <DataTableCell>
                      {a.patient?.id ? (
                        <Link href={`/dashboard/medical-center/patients/${a.patient.id}`} className="text-blue-700 hover:underline">
                          {a.patient?.name ?? "—"}
                        </Link>
                      ) : (
                        a.patient?.name ?? "—"
                      )}
                    </DataTableCell>
                    <DataTableCell>{a.doctor?.user?.name} — {a.doctor?.specialty?.nameAr}</DataTableCell>
                    <DataTableCell><Badge variant="secondary">{a.status}</Badge></DataTableCell>
                    <DataTableCell>{a.paymentStatus}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap">₪{a.fee ?? "—"}</DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filtered.map((a) => (
                <Card key={a.id}>
                  <CardContent className="p-4 space-y-2 text-sm">
                    <p className="font-semibold">{a.patient?.name ?? "—"}</p>
                    <p>{a.doctor?.user?.name} — {a.doctor?.specialty?.nameAr}</p>
                    <p className="text-gray-500">{formatDateNumeric(a.appointmentDate)} {a.startTime}</p>
                    <p>₪{a.fee ?? "—"} • {a.paymentStatus}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DataTableShell>
      )}
    </div>
  );
}
