"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import IconHeart from "@/components/icon/icon-heart";
import IconClock from "@/components/icon/icon-clock";
import IconUserPlus from "@/components/icon/icon-user-plus";
import IconPencil from "@/components/icon/icon-pencil";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DAYS_AR, formatNumber } from "@/lib/utils";
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
import { DropdownSelect } from "@/components/ui/dropdown-select";

type Slot = { id: string; dayOfWeek: number; startTime: string; endTime: string; isActive?: boolean };

type PendingInvite = {
  id: string;
  createdAt: string;
  doctorName: string;
  specialtyAr: string;
};

type Doc = {
  id: string;
  status: string;
  /** إعداد الطبيب؛ اللوحة تعرض الجميع بغض النظر عن القيمة */
  visibleToPatients?: boolean | null;
  consultationFee?: number;
  /** مستحقات الطبيب من العيادة (حساب الطبيب) */
  doctorClinicFee?: number;
  user?: { name?: string; email?: string; phone?: string };
  specialty?: { nameAr?: string };
  timeSlots?: Slot[];
};

function hoursSummary(slots: Slot[]) {
  const active = slots.filter((s) => s.isActive !== false);
  const byDay = active.reduce<Record<number, Slot[]>>((acc, s) => {
    if (!acc[s.dayOfWeek]) acc[s.dayOfWeek] = [];
    acc[s.dayOfWeek].push(s);
    return acc;
  }, {});
  const minMax = (list: Slot[]) => {
    if (!list.length) return "";
    const starts = list.map((x) => x.startTime).sort();
    const ends = list.map((x) => x.endTime).sort();
    return `من ${starts[0]} إلى ${ends[ends.length - 1]}`;
  };
  return Object.entries(byDay)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([day, list]) => `${DAYS_AR[Number(day)]}: ${minMax(list)}`)
    .join(" · ");
}

function visibilityBadge(visibleToPatients: boolean | null | undefined) {
  const on = visibleToPatients !== false;
  if (on) {
    return (
      <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-800 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300">
        يظهر في البحث العام
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-800 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300">
      عبر المركز فقط
    </span>
  );
}

function statusBadge(status: string) {
  if (status === "APPROVED")
    return (
      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
        معتمد
      </span>
    );
  if (status === "PENDING")
    return (
      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
        قيد المراجعة
      </span>
    );
  return (
    <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
      {status}
    </span>
  );
}

export default function CenterDoctorsPage() {
  const [doctors, setDoctors] = useState<Doc[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [viewMode, setViewMode] = useState<TableViewMode>("table");

  useEffect(() => {
    fetch("/api/medical-center/doctors")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setErr(j.error);
        else setDoctors(j.doctors ?? []);
      })
      .catch(() => setErr("تعذر التحميل"));
  }, []);

  useEffect(() => {
    fetch("/api/medical-center/doctor-invites")
      .then((r) => r.json())
      .then((j) => {
        if (j.invites) setPendingInvites(j.invites);
      })
      .catch(() => {});
  }, []);

  const specialtyOptions = useMemo(() => {
    const set = new Set<string>();
    doctors.forEach((d) => {
      const s = d.specialty?.nameAr;
      if (s) set.add(s);
    });
    return [{ value: "", label: "كل التخصصات" }, ...[...set].sort().map((s) => ({ value: s, label: s }))];
  }, [doctors]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return doctors.filter((d) => {
      const spec = d.specialty?.nameAr ?? "";
      if (specialtyFilter && spec !== specialtyFilter) return false;
      if (!q) return true;
      const name = d.user?.name ?? "";
      const email = d.user?.email ?? "";
      const phone = d.user?.phone ?? "";
      return (
        name.toLowerCase().includes(q) ||
        spec.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        phone.includes(q) ||
        d.id.toLowerCase().includes(q)
      );
    });
  }, [doctors, search, specialtyFilter]);

  const totalPatientToCenter = useMemo(
    () => filtered.reduce((sum, d) => sum + (d.consultationFee ?? 0), 0),
    [filtered]
  );
  const totalDoctorFromClinic = useMemo(
    () => filtered.reduce((sum, d) => sum + (d.doctorClinicFee ?? 0), 0),
    [filtered]
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 mx-auto max-w-6xl">
      <Link href="/dashboard/medical-center" className="text-sm text-blue-600 hover:underline mb-4 inline-block dark:text-blue-400">
        ← الرئيسية
      </Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <IconHeart className="h-6 w-6 text-blue-600 shrink-0" />
          أطباء المركز
        </h1>
        <Button asChild className="gap-2">
          <Link href="/dashboard/medical-center/doctors/new">
            <IconUserPlus className="h-4 w-4" />
            إضافة طبيب
          </Link>
        </Button>
      </div>
      {err && <p className="text-red-600 text-sm mb-4">{err}</p>}

      {pendingInvites.length > 0 ? (
        <Card className="mb-6 border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardContent className="py-4 space-y-3">
            <p className="text-sm font-bold text-amber-950 dark:text-amber-100">في انتظار موافقة الطبيب</p>
            <ul className="space-y-2 text-sm text-amber-900 dark:text-amber-200/90">
              {pendingInvites.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-amber-200/60 pb-2 last:border-0 dark:border-amber-800/40">
                  <span>
                    د. {inv.doctorName || "—"}
                    {inv.specialtyAr ? (
                      <Badge variant="outline" className="me-2 text-xs border-amber-300">
                        {inv.specialtyAr}
                      </Badge>
                    ) : null}
                  </span>
                  <span className="text-xs text-amber-800/80">طلب انضمام مرسل</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {doctors.length === 0 ? (
        <Card className="dark:border-gray-700 dark:bg-gray-900/40">
          <CardContent className="py-10 text-center text-gray-500 space-y-4 dark:text-gray-400">
            <p>لا يوجد أطباء مضافون بعد.</p>
            <Button asChild>
              <Link href="/dashboard/medical-center/doctors/new">إضافة طبيب</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DataTableShell
          searchPlaceholder="ابحث بالاسم، التخصص، البريد، الهاتف..."
          searchQuery={search}
          onSearchChange={setSearch}
          summaryValue={`${formatNumber(totalPatientToCenter, { maximumFractionDigits: 0 })} ₪ | ${formatNumber(totalDoctorFromClinic, { maximumFractionDigits: 0 })} ₪`}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          filterSlot={
            <div className="w-40 min-w-[10rem]">
              <DropdownSelect
                value={specialtyFilter}
                onChange={setSpecialtyFilter}
                options={specialtyOptions}
                placeholder="التخصص"
                buttonClassName="h-9 text-xs"
              />
            </div>
          }
        >
          {viewMode === "table" ? (
            <DataTable className="min-w-[1150px]">
              <DataTableHead>
                <DataTableHeaderCell className="w-14 text-center">تسلسل</DataTableHeaderCell>
                <DataTableHeaderCell className="w-[210px]">الاسم</DataTableHeaderCell>
                <DataTableHeaderCell className="w-[130px]">التخصص</DataTableHeaderCell>
                <DataTableHeaderCell className="w-[120px]">الحالة</DataTableHeaderCell>
                <DataTableHeaderCell className="w-[150px]">الظهور للمرضى</DataTableHeaderCell>
                <DataTableHeaderCell className="w-[140px] text-center">رسوم المريض للمركز</DataTableHeaderCell>
                <DataTableHeaderCell className="w-[170px] text-center">مستحقات الطبيب من العيادة</DataTableHeaderCell>
                <DataTableHeaderCell className="w-[220px]">أوقات العمل</DataTableHeaderCell>
                <DataTableHeaderCell className="w-[90px] text-center">إجراءات</DataTableHeaderCell>
              </DataTableHead>
              <DataTableBody>
                {filtered.map((d, rowIndex) => {
                  const slots = (d.timeSlots ?? []).filter((s) => s.isActive !== false);
                  const fee = d.consultationFee ?? 0;
                  const docClinic = d.doctorClinicFee ?? 0;
                  const seq = rowIndex + 1;
                  return (
                    <DataTableRow key={d.id}>
                      <DataTableCell className="text-center font-semibold tabular-nums text-gray-700 dark:text-gray-300">
                        {seq}
                      </DataTableCell>
                      <DataTableCell>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                            د. {d.user?.name ?? "—"}
                          </p>
                          <p className="truncate text-xs text-gray-500 dark:text-gray-400" dir="ltr">
                            {d.user?.email ?? d.user?.phone ?? "—"}
                          </p>
                        </div>
                      </DataTableCell>
                      <DataTableCell>
                        <Badge
                          variant="outline"
                          className="max-w-[120px] truncate border-emerald-200 text-emerald-800 dark:border-emerald-800 dark:text-emerald-300"
                        >
                          {d.specialty?.nameAr ?? "—"}
                        </Badge>
                      </DataTableCell>
                      <DataTableCell>{statusBadge(d.status)}</DataTableCell>
                      <DataTableCell>{visibilityBadge(d.visibleToPatients)}</DataTableCell>
                      <DataTableCell className="text-center">
                        <span className={fee < 0 ? "font-semibold text-red-600 dark:text-red-400" : "font-semibold text-emerald-700 dark:text-emerald-400"}>
                          ₪{formatNumber(fee, { maximumFractionDigits: 0 })}
                        </span>
                      </DataTableCell>
                      <DataTableCell className="text-center">
                        <span className="font-semibold tabular-nums text-blue-800 dark:text-blue-300">
                          ₪{formatNumber(docClinic, { maximumFractionDigits: 0 })}
                        </span>
                      </DataTableCell>
                      <DataTableCell className="text-xs leading-5 text-gray-600 dark:text-gray-400">
                        <div className="max-w-[220px] whitespace-normal break-words">
                          {hoursSummary(slots) || "—"}
                        </div>
                      </DataTableCell>
                      <DataTableCell className="text-center">
                        <Link
                          href={`/dashboard/medical-center/doctors/${d.id}`}
                          className="inline-flex items-center justify-center rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
                          title="تعديل"
                        >
                          <IconPencil className="h-4 w-4" />
                        </Link>
                      </DataTableCell>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((d, rowIndex) => {
                const slots = (d.timeSlots ?? []).filter((s) => s.isActive !== false);
                const seq = rowIndex + 1;
                return (
                  <Card key={d.id} className="border-gray-200 dark:border-gray-700 dark:bg-gray-900/40">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            تسلسل: <span className="tabular-nums font-bold text-gray-800 dark:text-gray-200">{seq}</span>
                          </p>
                          <p className="font-semibold text-gray-900 dark:text-white mt-1">د. {d.user?.name ?? "—"}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {statusBadge(d.status)}
                          {visibilityBadge(d.visibleToPatients)}
                        </div>
                      </div>
                      <Badge variant="secondary">{d.specialty?.nameAr ?? "—"}</Badge>
                      <p className="text-sm space-y-0.5">
                        <span className="block">
                          <span className="text-gray-500">رسوم المريض للمركز: </span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">₪{d.consultationFee ?? 0}</span>
                        </span>
                        <span className="block text-xs">
                          <span className="text-gray-500">مستحقات الطبيب من العيادة: </span>
                          <span className="font-semibold text-blue-800 dark:text-blue-300">₪{d.doctorClinicFee ?? 0}</span>
                        </span>
                      </p>
                      <div className="text-xs text-gray-600 dark:text-gray-400 flex gap-1 items-start">
                        <IconClock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>{hoursSummary(slots) || "لا توجد أوقات"}</span>
                      </div>
                      <Button variant="outline" size="sm" className="w-full gap-1" asChild>
                        <Link href={`/dashboard/medical-center/doctors/${d.id}`}>
                          <IconPencil className="h-3.5 w-3.5" />
                          إدارة الطبيب
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </DataTableShell>
      )}
    </div>
  );
}
