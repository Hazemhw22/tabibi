"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import IconLoader from "@/components/icon/icon-loader";
import IconPrinter from "@/components/icon/icon-printer";
import { cn } from "@/lib/utils";
import type { CarePlanType } from "@/lib/specialty-plan-registry";
import { CARE_PLAN_LABELS } from "@/lib/specialty-plan-registry";
import { printHtmlDocument } from "@/lib/print-html";
import {
  buildCarePlanLetterheadHtml,
  type CarePlanLetterheadPatient,
} from "@/lib/care-plan-print-html";
import { getFollowUpVisitsFromPlanData } from "@/lib/care-plan-follow-ups";
import { serializeCarePlanSectionsForPrint } from "@/lib/care-plan-print-serialize";

function doctorDisplayNameAr(name: string | undefined): string {
  const n = (name ?? "").trim();
  if (!n) return "د. —";
  if (/^د\.?\s*/u.test(n) || /^د\s/u.test(n)) return n;
  return `د. ${n}`;
}

function carePlanApiUrl(patientId: string, source: "clinic" | "platform") {
  if (source === "clinic") return `/api/clinic/patients/${patientId}/care-plan`;
  return `/api/doctor/platform-patients/${patientId}/care-plan`;
}

type Props = {
  patientId: string;
  patientSource: "clinic" | "platform";
  carePlanType: CarePlanType;
  patientName: string;
  doctorDisplayName: string;
  patientPrintDemographics?: {
    fileNumber?: string | null;
    gender?: string | null;
    dateOfBirth?: string | null;
    guardian?: string | null;
  };
  /** لتحديث حالة «لا توجد ملفات» في الأب */
  onPlanLoaded?: (hasPlan: boolean) => void;
};

export function MedicalFilesCarePlanTable({
  patientId,
  patientSource,
  carePlanType,
  patientName,
  doctorDisplayName,
  patientPrintDemographics,
  onPlanLoaded,
}: Props) {
  const onPlanLoadedRef = useRef(onPlanLoaded);
  onPlanLoadedRef.current = onPlanLoaded;

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<{
    planType: string;
    data: Record<string, unknown>;
    doctorNotes: string | null;
    updatedAt: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(carePlanApiUrl(patientId, patientSource));
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPlan(null);
        onPlanLoadedRef.current?.(false);
        return;
      }
      const p = j.plan as {
        planType?: string;
        data?: Record<string, unknown>;
        doctorNotes?: string | null;
        updatedAt?: string;
      } | null;
      if (p?.planType) {
        const row = {
          planType: p.planType,
          data: (p.data as Record<string, unknown>) ?? {},
          doctorNotes: p.doctorNotes ?? null,
          updatedAt: p.updatedAt ?? new Date().toISOString(),
        };
        setPlan(row);
        onPlanLoadedRef.current?.(true);
      } else {
        setPlan(null);
        onPlanLoadedRef.current?.(false);
      }
    } catch {
      setPlan(null);
      onPlanLoadedRef.current?.(false);
    } finally {
      setLoading(false);
    }
  }, [patientId, patientSource]);

  useEffect(() => {
    void load();
  }, [load]);

  const label = CARE_PLAN_LABELS[carePlanType] ?? "خطة العلاج";
  const effectiveType = (plan?.planType as CarePlanType) ?? carePlanType;

  const printPatient: CarePlanLetterheadPatient = useMemo(
    () => ({
      name: patientName || "—",
      recordId: patientId,
      fileNumber: patientPrintDemographics?.fileNumber,
      gender: patientPrintDemographics?.gender,
      dateOfBirth: patientPrintDemographics?.dateOfBirth,
      guardian: patientPrintDemographics?.guardian,
    }),
    [patientId, patientName, patientPrintDemographics],
  );

  const doctorAr = doctorDisplayNameAr(doctorDisplayName);

  const handlePrint = () => {
    if (!plan || typeof window === "undefined") return;
    const title = CARE_PLAN_LABELS[effectiveType] ?? label;
    const data = plan.data;
    const sections = serializeCarePlanSectionsForPrint(effectiveType, data);
    const html = buildCarePlanLetterheadHtml({
      origin: window.location.origin,
      documentTitleAr: title,
      issuedAtAr: new Date().toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" }),
      doctor: { displayNameAr: doctorAr },
      patient: printPatient,
      sections,
      followUpVisits: getFollowUpVisitsFromPlanData(data, effectiveType),
      recommendationsText: plan.doctorNotes ?? "",
    });
    printHtmlDocument(html, title);
  };

  const followUpCount = plan
    ? getFollowUpVisitsFromPlanData(plan.data, effectiveType).filter(
        (v) => v.date?.trim() || (v.time ?? "").trim() || (v.note ?? "").trim(),
      ).length
    : 0;

  const notesPreview = (plan?.doctorNotes ?? "").trim();
  const notesShort =
    notesPreview.length > 72 ? `${notesPreview.slice(0, 72)}…` : notesPreview || "—";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border shadow-sm",
        "border-slate-200/90 bg-gradient-to-br from-white to-slate-50/80",
        "dark:border-slate-600 dark:from-slate-900/90 dark:to-slate-900/60",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5",
          "border-slate-100 bg-slate-50/80 dark:border-slate-700/80 dark:bg-slate-800/50",
        )}
      >
        <div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">خطة العلاج</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">ملخص من السجل السريري</p>
        </div>
      </div>

      <div className="table-scroll-mobile -mx-0 w-full min-w-0 px-2 pb-2 pt-1 sm:px-0 sm:pb-3 sm:pt-2">
        <table className="min-w-[640px] w-full text-sm">
          <thead>
            <tr
              className={cn(
                "text-right text-[11px] font-semibold uppercase tracking-wide",
                "border-b border-slate-100 text-slate-500",
                "dark:border-slate-700 dark:text-slate-400",
              )}
            >
              <th className="px-4 py-2.5">نوع الخطة</th>
              <th className="px-4 py-2.5">آخر تحديث</th>
              <th className="px-4 py-2.5 text-center">مواعيد المتابعة</th>
              <th className="min-w-[140px] px-4 py-2.5">ملاحظات الطبيب</th>
              <th className="w-14 px-2 py-2.5 text-center print:hidden" aria-label="طباعة">
                <span className="sr-only">طباعة</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/80">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  <IconLoader className="mx-auto h-6 w-6 animate-spin" />
                </td>
              </tr>
            ) : !plan ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500"
                >
                  لا توجد خطة علاج محفوظة لهذا المريض بعد.
                </td>
              </tr>
            ) : (
              <tr className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                  {CARE_PLAN_LABELS[effectiveType] ?? plan.planType}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                  {format(new Date(plan.updatedAt), "d MMMM yyyy — HH:mm", { locale: ar })}
                </td>
                <td className="px-4 py-3 text-center tabular-nums">
                  <span
                    className={cn(
                      "inline-flex min-w-[2rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold",
                      followUpCount > 0
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-200"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                    )}
                  >
                    {followUpCount}
                  </span>
                </td>
                <td className="max-w-[220px] px-4 py-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {notesShort}
                </td>
                <td className="px-2 py-3 text-center print:hidden">
                  <button
                    type="button"
                    onClick={handlePrint}
                    title="طباعة خطة العلاج"
                    aria-label="طباعة خطة العلاج"
                    className={cn(
                      "inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                      "text-slate-600 hover:bg-blue-50 hover:text-blue-700",
                      "dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white",
                    )}
                  >
                    <IconPrinter className="h-[18px] w-[18px]" />
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
