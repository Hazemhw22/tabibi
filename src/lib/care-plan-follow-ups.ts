import {
  INTL_CLINICAL_DATA_KEY,
  INTL_FOLLOW_UP_VISITS_KEY,
  type IntlFollowUpVisit,
} from "@/components/doctor-care-plans/clinical-intl-care-plan-config";

/** مواعيد المتابعة على مستوى جذر `data` في خطة العلاج (موحّد لجميع التخصصات) */
export const CARE_PLAN_FOLLOW_UP_VISITS_KEY = "followUpVisits" as const;

function isFollowUpVisit(x: unknown): x is IntlFollowUpVisit {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.date === "string";
}

function normalizeVisit(v: IntlFollowUpVisit): IntlFollowUpVisit {
  const o = v as Record<string, unknown>;
  return {
    id: v.id,
    date: v.date,
    time: typeof o.time === "string" ? o.time : undefined,
    slot: typeof o.slot === "string" ? o.slot : undefined,
    note: typeof v.note === "string" ? v.note : undefined,
  };
}

function normalizeVisitsArray(arr: unknown[]): IntlFollowUpVisit[] {
  return arr.filter(isFollowUpVisit).map(normalizeVisit);
}

/**
 * يقرأ من الجذر أولاً، ثم يfallback للنسخ القديمة داخل intlClinical[carePlanType].
 */
export function getFollowUpVisitsFromPlanData(
  data: Record<string, unknown>,
  carePlanType?: string,
): IntlFollowUpVisit[] {
  const root = data[CARE_PLAN_FOLLOW_UP_VISITS_KEY];
  if (Array.isArray(root) && root.length > 0) return normalizeVisitsArray(root);

  if (carePlanType && data[INTL_CLINICAL_DATA_KEY] && typeof data[INTL_CLINICAL_DATA_KEY] === "object") {
    const ic = data[INTL_CLINICAL_DATA_KEY] as Record<string, unknown>;
    const slice = ic[carePlanType];
    if (slice && typeof slice === "object") {
      const nested = (slice as Record<string, unknown>)[INTL_FOLLOW_UP_VISITS_KEY];
      if (Array.isArray(nested) && nested.length > 0) return normalizeVisitsArray(nested);
    }
  }
  if (Array.isArray(root)) return normalizeVisitsArray(root);
  return [];
}

export function weekdayArFromIso(isoDate: string): string {
  if (!isoDate?.trim()) return "—";
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("ar", { weekday: "long" }).format(d);
  } catch {
    return "—";
  }
}

export function formatFollowUpLinesAr(visits: IntlFollowUpVisit[]): string[] {
  const printable = visits.filter(
    (x) =>
      x.date?.trim() ||
      (x.time ?? "").trim() ||
      (x.slot ?? "").trim() ||
      (x.note ?? "").trim(),
  );
  return [...printable].sort((a, b) => (a.date || "").localeCompare(b.date || "")).map((x) => {
    const parts: string[] = [];
    if (x.date?.trim()) {
      parts.push(`${x.date} (${weekdayArFromIso(x.date)})`);
    }
    const t = (x.time ?? "").trim();
    if (t) parts.push(`الساعة ${t}`);
    const s = (x.slot ?? "").trim();
    if (s) parts.push(`الدور: ${s}`);
    const n = (x.note ?? "").trim();
    if (n) parts.push(n);
    return parts.join(" — ") || "—";
  });
}
