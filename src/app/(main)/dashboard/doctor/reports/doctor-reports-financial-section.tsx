"use client";

import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import IconPrinter from "@/components/icon/icon-printer";
import IconReceipt from "@/components/icon/icon-receipt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildFinancialReportPrintHtml } from "@/lib/financial-report-print-html";
import { printHtmlDocument } from "@/lib/print-html";
import { amountSignedColorClass, formatSignedShekel } from "@/lib/money-display";
import { ledgerBalance, transactionSignedDelta } from "@/lib/patient-transaction-math";
import { cn } from "@/lib/utils";

export type DoctorFinancialRow = {
  id: string;
  type: "SERVICE" | "PAYMENT";
  description: string;
  amount: number;
  date: string;
  patientName: string;
  patientKey: string;
  source: "عيادة" | "منصة";
};

const ALL_PATIENTS = "__all__";

export default function DoctorReportsFinancialSection({
  rows,
  doctorName,
}: {
  rows: DoctorFinancialRow[];
  doctorName: string;
}) {
  const [search, setSearch] = useState("");
  const [patientKey, setPatientKey] = useState<string>(ALL_PATIENTS);

  const patientOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) {
      if (!m.has(r.patientKey)) {
        m.set(r.patientKey, `${r.patientName} (${r.source})`);
      }
    }
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1], "ar"));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (patientKey !== ALL_PATIENTS && row.patientKey !== patientKey) return false;
      if (!q) return true;
      const dateStr = row.date
        ? format(new Date(row.date), "d MMM yyyy", { locale: ar })
        : "";
      const hay = `${row.patientName} ${row.description} ${row.source} ${dateStr}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search, patientKey]);

  const balance = useMemo(
    () => ledgerBalance(filtered.map((r) => ({ type: r.type, amount: r.amount }))),
    [filtered]
  );

  const selectedPatientLabel =
    patientKey === ALL_PATIENTS
      ? "جميع المرضى"
      : patientOptions.find(([k]) => k === patientKey)?.[1] ?? "—";

  const printReport = useCallback(() => {
    if (filtered.length === 0) return;
    const issuedAtLabel = new Date().toLocaleString("ar", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const html = buildFinancialReportPrintHtml({
      mode: "multi-patient",
      doctorName: doctorName || "—",
      patientLine: selectedPatientLabel,
      issuedAtLabel,
      searchNote: search.trim() || undefined,
      rows: filtered.map((row) => ({
        date: row.date,
        type: row.type,
        description: row.description,
        amount: row.amount,
        patientName: row.patientName,
        source: row.source,
      })),
    });
    printHtmlDocument(html, "تقرير الخدمات والدفعات");
  }, [filtered, doctorName, selectedPatientLabel, search]);

  return (
    <Card className="overflow-hidden rounded-2xl border-0 shadow-lg shadow-gray-200/50 dark:border dark:border-slate-700/80 dark:shadow-slate-950/50">
      <CardHeader className="border-b border-gray-100 bg-gradient-to-l from-slate-50 to-white px-6 py-5 dark:border-slate-700 dark:from-slate-900 dark:to-slate-950 print:hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="flex items-center gap-3 text-lg dark:text-slate-100">
            <div className="rounded-xl bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <IconReceipt className="h-5 w-5" />
            </div>
            الخدمات والدفعات
          </CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Input
              dir="rtl"
              placeholder="بحث (مريض، وصف، تاريخ...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-[220px] bg-white dark:bg-slate-900"
            />
            <Select value={patientKey} onValueChange={setPatientKey}>
              <SelectTrigger className="w-full sm:w-[min(100%,280px)] bg-white dark:bg-slate-900">
                <SelectValue placeholder="المريض" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PATIENTS}>جميع المرضى</SelectItem>
                {patientOptions.map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={printReport}
              disabled={filtered.length === 0}
            >
              <IconPrinter className="h-4 w-4" />
              طباعة / PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div dir="rtl">
          <div className="mb-4 border-b border-gray-200 px-4 py-3 text-right dark:border-slate-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">
              تقرير الخدمات والدفعات
            </h2>
            <p className="text-sm text-gray-700 dark:text-slate-300">الطبيب: {doctorName || "—"}</p>
            <p className="text-sm text-gray-700 dark:text-slate-300">المريض: {selectedPatientLabel}</p>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              {format(new Date(), "d MMMM yyyy", { locale: ar })}
            </p>
            {search.trim() ? (
              <p className="text-xs text-gray-500 dark:text-slate-500">بحث: {search.trim()}</p>
            ) : null}
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-slate-400">
              <IconReceipt className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-slate-600" />
              <p>لا توجد خدمات أو دفعات مطابقة</p>
            </div>
          ) : (
            <>
              <div className="-mx-3 touch-pan-x overflow-x-auto px-3 scrollbar-hide sm:mx-0 sm:px-0">
                <table className="min-w-[560px] w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/80 text-right dark:border-slate-700 dark:bg-slate-800/60">
                      <th className="px-4 py-3 font-semibold text-gray-600 dark:text-slate-400">
                        التاريخ
                      </th>
                      <th className="px-4 py-3 font-semibold text-gray-600 dark:text-slate-400">
                        المريض
                      </th>
                      <th className="px-4 py-3 font-semibold text-gray-600 dark:text-slate-400">
                        النوع
                      </th>
                      <th className="px-4 py-3 font-semibold text-gray-600 dark:text-slate-400">
                        الوصف
                      </th>
                      <th className="px-4 py-3 font-semibold text-gray-600 dark:text-slate-400">
                        المبلغ
                      </th>
                      <th className="px-4 py-3 font-semibold text-gray-600 dark:text-slate-400">
                        المصدر
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700/80">
                    {filtered.map((row) => {
                      const signed = transactionSignedDelta({
                        type: row.type,
                        amount: row.amount,
                      });
                      return (
                        <tr
                          key={`${row.source}-${row.id}`}
                          className="transition-colors hover:bg-gray-50/80 dark:hover:bg-slate-800/50"
                        >
                          <td className="px-4 py-3 text-gray-700 dark:text-slate-300">
                            {row.date
                              ? format(new Date(row.date), "d MMM yyyy", { locale: ar })
                              : "—"}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">
                            {row.patientName}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={row.type === "PAYMENT" ? "success" : "destructive"}>
                              {row.type === "PAYMENT" ? "دفعة" : "خدمة"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-slate-400">
                            {row.description}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-3 font-semibold tabular-nums",
                              amountSignedColorClass(signed)
                            )}
                          >
                            {formatSignedShekel(signed)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className="text-xs dark:border-slate-600 dark:text-slate-300"
                            >
                              {row.source}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50/90 dark:border-slate-600 dark:bg-slate-800/40">
                      <td
                        colSpan={4}
                        className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-slate-200"
                      >
                        رصيد المعروض (سالب = دين على المريض)
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right font-bold tabular-nums",
                          amountSignedColorClass(balance)
                        )}
                      >
                        {formatSignedShekel(balance)}
                      </td>
                      <td className="px-4 py-3" aria-hidden />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
