import type { CarePlanType } from "@/lib/specialty-plan-registry";
import { escapeHtml, type CarePlanLetterheadSection } from "@/lib/care-plan-print-html";

/** تخصصات تُخزَّن فيها خطة الأسنان (32 سنّاً) في DentalToothPlan / PlatformDentalToothPlan */
export function carePlanUsesDentalToothTableData(t: CarePlanType): boolean {
  return t === "DENTAL" || t === "DENTAL_IMPLANT_IMMEDIATE_SURGICAL" || t === "DENTAL_IMPLANT_COSMETIC";
}

const PROBLEM_LABELS: Record<string, string> = {
  FILLING: "حشوة",
  RCT: "عصب",
  CROWN: "تاج",
  IMPLANT: "زرعة",
  EXTRACTION: "خلع",
  ORTHO: "تقويم",
  BLEACHING: "تبييض",
  SCALING: "تنظيف",
};

export type DentalToothPlanItem = {
  toothNumber: number;
  problemType: string;
  note?: string | null;
  isDone?: boolean | null;
};

/** تسمية عربية لما اختاره الطبيب من خطة العلاج للسن */
export function formatDentalProblemLabelAr(problemType: string, note?: string | null): string {
  const n = (note ?? "").trim();
  if (problemType.startsWith("OTHER:")) {
    const rest = problemType.slice(6).trim();
    return rest || n || "أخرى";
  }
  return PROBLEM_LABELS[problemType] ?? problemType;
}

/** قسم طباعة: سنّ، إجراء من الخطة، ملاحظة، إنجاز — بدون تكلفة */
export function buildDentalToothPlanPrintSection(items: DentalToothPlanItem[]): CarePlanLetterheadSection | null {
  if (!items.length) return null;
  const rows = items
    .slice()
    .sort((a, b) => a.toothNumber - b.toothNumber)
    .map((it) => {
      const proc = formatDentalProblemLabelAr(it.problemType, it.note);
      const note = (it.note ?? "").trim();
      const done = it.isDone ? "نعم" : "لا";
      return `<tr><td class="l" dir="ltr">${it.toothNumber}</td><td>${escapeHtml(proc)}</td><td>${escapeHtml(note || "—")}</td><td>${done}</td></tr>`;
    })
    .join("");
  return {
    titleAr: "خطة العلاج — الأسنان (حسب رقم السن)",
    titleEn: "Dental plan per tooth",
    bodyHtml: `<table class="print-tbl"><thead><tr><th>رقم السن</th><th>الإجراء المختار</th><th>ملاحظة</th><th>تم التنفيذ</th></tr></thead><tbody>${rows}</tbody></table>`,
  };
}
