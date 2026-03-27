"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import IconCashBanknotes from "@/components/icon/icon-cash-banknotes";
import IconTrendingUp from "@/components/icon/icon-trending-up";
import IconHeart from "@/components/icon/icon-heart";
import IconBuilding from "@/components/icon/icon-building";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import {
  DataTableShell,
  DataTable,
  DataTableHead,
  DataTableHeaderCell,
  DataTableBody,
  DataTableRow,
  DataTableCell,
} from "@/components/ui/data-table-shell";
import { CENTER_ROLE_ADMIN } from "@/lib/medical-center-roles";
import LoadingScreen from "@/components/ui/loading-screen";

type FinanceRow = {
  doctorId: string;
  doctorName: string;
  appointmentCount: number;
  patientFeesTotal: number;
  doctorClinicFeesTotal: number;
  estimatedNet: number;
};

type Stats = {
  totalPatientFees: number;
  appointmentFeesTotal?: number;
  emergencyFeesPaid?: number;
  totalDoctorClinicFees: number;
  estimatedCenterNet: number;
};

export default function MedicalCenterFinancePage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<FinanceRow[]>([]);
  const [count, setCount] = useState(0);
  const [emergencyPaidCount, setEmergencyPaidCount] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  /** فلتر حسب الطبيب — فارغ = الكل */
  const [doctorFilter, setDoctorFilter] = useState("");

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (session?.user?.role !== CENTER_ROLE_ADMIN) {
      router.replace("/dashboard/medical-center");
      return;
    }
    fetch("/api/medical-center/finance")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setErr(j.error);
        else {
          setStats(j.stats);
          setCount(j.appointmentCount ?? 0);
          setEmergencyPaidCount(j.emergencyPaidCount ?? 0);
          setRows(Array.isArray(j.rows) ? j.rows : []);
        }
      })
      .catch(() => setErr("تعذر التحميل"))
      .finally(() => setLoading(false));
  }, [session?.user?.role, sessionStatus, router]);

  const fmt = (n: number) =>
    formatNumber(n, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (doctorFilter && r.doctorId !== doctorFilter) return false;
      if (!q) return true;
      return r.doctorName.toLowerCase().includes(q);
    });
  }, [rows, search, doctorFilter]);

  const filteredTotals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => ({
        patient: acc.patient + r.patientFeesTotal,
        doctor: acc.doctor + r.doctorClinicFeesTotal,
        appts: acc.appts + r.appointmentCount,
      }),
      { patient: 0, doctor: 0, appts: 0 }
    );
  }, [filtered]);

  const netFiltered = filteredTotals.patient - filteredTotals.doctor;

  const doctorOptions = useMemo(() => {
    return [
      { value: "", label: "كل الأطباء" },
      ...rows.map((r) => ({ value: r.doctorId, label: r.doctorName })),
    ];
  }, [rows]);

  if (sessionStatus === "loading" || session?.user?.role !== CENTER_ROLE_ADMIN) {
    return <LoadingScreen label="جاري التحميل..." />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 mx-auto max-w-6xl">
      <Link
        href="/dashboard/medical-center"
        className="text-sm text-blue-600 mb-4 inline-block dark:text-blue-400"
      >
        ← الرئيسية
      </Link>

      <div className="mb-6 space-y-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <IconCashBanknotes className="h-7 w-7 text-emerald-600 shrink-0" />
          حسابات المركز الطبي
        </h1>

        {stats && !err && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card className="border-emerald-200 dark:border-emerald-900/50 dark:bg-gray-900/40">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-1">
                  <IconBuilding className="h-4 w-4 shrink-0" />
                  ما دفعه المرضى (إجمالي المركز)
                </p>
                <p className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  ₪{fmt(stats.totalPatientFees)}
                </p>
                {(stats.appointmentFeesTotal != null || stats.emergencyFeesPaid != null) && (
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-2 leading-relaxed">
                    {stats.appointmentFeesTotal != null && (
                      <>حجوزات عبر المركز: ₪{fmt(stats.appointmentFeesTotal)}</>
                    )}
                    {stats.emergencyFeesPaid != null && stats.emergencyFeesPaid > 0 && (
                      <>
                        {stats.appointmentFeesTotal != null ? " · " : ""}
                        طوارئ (مسدّد): ₪{fmt(stats.emergencyFeesPaid)}
                        {emergencyPaidCount > 0 ? ` (${emergencyPaidCount})` : ""}
                      </>
                    )}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="border-blue-200 dark:border-blue-900/50 dark:bg-gray-900/40">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-blue-800 dark:text-blue-300 flex items-center gap-1.5 mb-1">
                  <IconHeart className="h-4 w-4 shrink-0" />
                  مستحقات الأطباء من العيادة
                </p>
                <p className="text-2xl font-bold tabular-nums text-blue-700 dark:text-blue-400">
                  ₪{fmt(stats.totalDoctorClinicFees)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 dark:border-amber-900/50 dark:bg-gray-900/40">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-amber-900 dark:text-amber-200 flex items-center gap-1.5 mb-1">
                  <IconTrendingUp className="h-4 w-4 shrink-0" />
                  صافي تقديري للمركز
                </p>
                <p
                  className={`text-2xl font-bold tabular-nums ${
                    stats.estimatedCenterNet >= 0
                      ? "text-gray-900 dark:text-white"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  ₪{fmt(stats.estimatedCenterNet)}
                </p>
                <p className="text-[11px] text-gray-500 mt-1">
                  حجوزات محتسبة: {formatNumber(count, { maximumFractionDigits: 0 })}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {loading && <p className="text-gray-500">جاري التحميل...</p>}
      {err && <p className="text-red-600 text-sm mb-4">{err}</p>}

      {!loading && stats && !err && (
        <DataTableShell
          searchPlaceholder="ابحث باسم الطبيب..."
          searchQuery={search}
          onSearchChange={setSearch}
          summaryValue={`${fmt(filteredTotals.patient)} ₪ | ${fmt(filteredTotals.doctor)} ₪ | ${fmt(netFiltered)} ₪ · ${formatNumber(filteredTotals.appts, { maximumFractionDigits: 0 })} حجز`}
          showViewToggle={false}
          filterSlot={
            <div className="w-48 min-w-[12rem]">
              <DropdownSelect
                value={doctorFilter}
                onChange={setDoctorFilter}
                options={doctorOptions}
                placeholder="تصفية حسب الطبيب"
                buttonClassName="h-9 text-xs"
              />
            </div>
          }
        >
          <DataTable className="min-w-[720px]">
            <DataTableHead>
              <DataTableHeaderCell className="w-14">#</DataTableHeaderCell>
              <DataTableHeaderCell>الطبيب</DataTableHeaderCell>
              <DataTableHeaderCell className="whitespace-nowrap">عدد الحجوزات</DataTableHeaderCell>
              <DataTableHeaderCell className="whitespace-nowrap">ما دفعه المرضى</DataTableHeaderCell>
              <DataTableHeaderCell className="whitespace-nowrap">مستحقات الطبيب من العيادة</DataTableHeaderCell>
              <DataTableHeaderCell className="whitespace-nowrap">الصافي التقديري</DataTableHeaderCell>
            </DataTableHead>
            <DataTableBody>
              {rows.length === 0 ? (
                <DataTableRow>
                  <DataTableCell colSpan={6} className="text-center text-gray-500 py-10">
                    لا يوجد أطباء مرتبطون بالمركز بعد.
                  </DataTableCell>
                </DataTableRow>
              ) : filtered.length === 0 ? (
                <DataTableRow>
                  <DataTableCell colSpan={6} className="text-center text-gray-500 py-10">
                    لا توجد صفوف تطابق البحث أو الفلتر.
                  </DataTableCell>
                </DataTableRow>
              ) : (
                filtered.map((r, i) => (
                  <DataTableRow key={r.doctorId}>
                    <DataTableCell className="text-center font-semibold tabular-nums text-gray-600 dark:text-gray-400">
                      {i + 1}
                    </DataTableCell>
                    <DataTableCell className="font-medium">د. {r.doctorName}</DataTableCell>
                    <DataTableCell className="tabular-nums">
                      {formatNumber(r.appointmentCount, { maximumFractionDigits: 0 })}
                    </DataTableCell>
                    <DataTableCell className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                      ₪{fmt(r.patientFeesTotal)}
                    </DataTableCell>
                    <DataTableCell className="font-semibold tabular-nums text-blue-800 dark:text-blue-300">
                      ₪{fmt(r.doctorClinicFeesTotal)}
                    </DataTableCell>
                    <DataTableCell
                      className={`font-bold tabular-nums ${
                        r.estimatedNet >= 0 ? "text-gray-900 dark:text-white" : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      ₪{fmt(r.estimatedNet)}
                    </DataTableCell>
                  </DataTableRow>
                ))
              )}
            </DataTableBody>
          </DataTable>
        </DataTableShell>
      )}
    </div>
  );
}
