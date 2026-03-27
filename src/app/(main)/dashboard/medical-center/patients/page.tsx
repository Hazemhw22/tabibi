"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import IconUsers from "@/components/icon/icon-users";
import IconPhone from "@/components/icon/icon-phone";
import IconMail from "@/components/icon/icon-mail";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { formatDateMedium } from "@/lib/utils";

type Row = {
  patient?: { name?: string; phone?: string; email?: string };
  lastVisit?: string;
};

export default function CenterPatientsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<TableViewMode>("table");

  useEffect(() => {
    fetch("/api/medical-center/patients")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setErr(j.error);
        else setRows(j.patients ?? []);
      })
      .catch(() => setErr("تعذر التحميل"));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const n = r.patient?.name ?? "";
      const p = r.patient?.phone ?? "";
      const e = r.patient?.email ?? "";
      return (
        n.toLowerCase().includes(q) ||
        p.includes(q) ||
        e.toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  const lastVisitLabel = (iso?: string) => (iso ? formatDateMedium(iso) : "—");

  return (
    <div className="p-4 sm:p-6 lg:p-8 mx-auto max-w-6xl">
      <Link href="/dashboard/medical-center" className="text-sm text-blue-600 mb-4 inline-block dark:text-blue-400">
        ← الرئيسية
      </Link>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <IconUsers className="h-6 w-6 text-blue-600 shrink-0" />
        مرضى المركز
      </h1>
      {err && <p className="text-red-600 text-sm mb-4">{err}</p>}

      {rows.length === 0 ? (
        <Card className="dark:border-gray-700 dark:bg-gray-900/40">
          <CardContent className="py-10 text-center text-gray-500 dark:text-gray-400">لا يوجد مرضى بعد.</CardContent>
        </Card>
      ) : (
        <DataTableShell
          searchPlaceholder="ابحث بالاسم، الهاتف، البريد..."
          searchQuery={search}
          onSearchChange={setSearch}
          summaryLabel="عدد السجلات"
          summaryValue={String(filtered.length)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        >
          {viewMode === "table" ? (
            <DataTable>
              <DataTableHead>
                <DataTableHeaderCell className="w-14">تسلسل</DataTableHeaderCell>
                <DataTableHeaderCell>اسم المريض</DataTableHeaderCell>
                <DataTableHeaderCell>الهاتف</DataTableHeaderCell>
                <DataTableHeaderCell>البريد</DataTableHeaderCell>
                <DataTableHeaderCell>نوع الحساب</DataTableHeaderCell>
                <DataTableHeaderCell>آخر حجز</DataTableHeaderCell>
              </DataTableHead>
              <DataTableBody>
                {filtered.map((r, i) => {
                  const name = r.patient?.name ?? "—";
                  const phone = r.patient?.phone ?? "";
                  const email = r.patient?.email ?? "";
                  const seq = i + 1;
                  return (
                    <DataTableRow key={`${name}-${phone}-${i}`}>
                      <DataTableCell className="text-center font-semibold tabular-nums text-gray-700 dark:text-gray-300">
                        {seq}
                      </DataTableCell>
                      <DataTableCell className="font-medium text-gray-900 dark:text-white">{name}</DataTableCell>
                      <DataTableCell dir="ltr" className="text-left font-mono text-sm">
                        {phone || "—"}
                      </DataTableCell>
                      <DataTableCell className="max-w-[200px] truncate text-sm" dir="ltr">
                        {email || "—"}
                      </DataTableCell>
                      <DataTableCell>
                        <Badge variant="outline" className="border-emerald-200 text-emerald-800 dark:border-emerald-800 dark:text-emerald-300">
                          مريض
                        </Badge>
                      </DataTableCell>
                      <DataTableCell className="text-gray-600 dark:text-gray-400 text-sm">
                        {lastVisitLabel(r.lastVisit)}
                      </DataTableCell>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((r, i) => {
                const seq = i + 1;
                return (
                <Card key={`${r.patient?.name}-${r.patient?.phone}-${i}`} className="border-gray-200 dark:border-gray-700 dark:bg-gray-900/40">
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      تسلسل: <span className="tabular-nums font-bold text-gray-800 dark:text-gray-200">{seq}</span>
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-white">{r.patient?.name ?? "—"}</p>
                    {r.patient?.phone && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <IconPhone className="h-3.5 w-3.5 shrink-0" />
                        <span dir="ltr">{r.patient.phone}</span>
                      </p>
                    )}
                    {r.patient?.email && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 truncate">
                        <IconMail className="h-3.5 w-3.5 shrink-0" />
                        <span dir="ltr" className="truncate">
                          {r.patient.email}
                        </span>
                      </p>
                    )}
                    <p className="text-xs text-gray-500 pt-1 border-t border-gray-100 dark:border-gray-800">
                      آخر حجز: {lastVisitLabel(r.lastVisit)}
                    </p>
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
