import type { CarePlanType } from "@/lib/specialty-plan-registry";

export type CarePlanServiceLine = {
  description: string;
  amount: number;
};

function safeNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function trimText(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function normalizeCarePlanCosts(
  planType: CarePlanType,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...data };

  const normalizeRows = (key: string) => {
    const rows = Array.isArray(out[key]) ? out[key] : null;
    if (!rows) return;
    out[key] = rows.map((row) => {
      const r = row as Record<string, unknown>;
      if (!("cost" in r)) return r;
      return { ...r, cost: Math.abs(safeNumber(r.cost)) };
    });
  };

  if (planType === "PEDIATRICS") normalizeRows("organs");
  if (planType === "ORTHOPEDICS") normalizeRows("injuries");
  if (planType === "UROLOGY_NEPHROLOGY") normalizeRows("issues");
  if (planType === "CARDIOLOGY") normalizeRows("cardiac");
  if (planType === "GENERIC" || planType === "DENTAL") normalizeRows("items");

  return out;
}

/** استخراج بنود الخدمة من بيانات خطة العلاج (قيمة موجبة قبل تحويلها بالسالب عند الحفظ). */
export function extractCarePlanServiceLines(
  planType: CarePlanType,
  data: Record<string, unknown>,
): CarePlanServiceLine[] {
  const out: CarePlanServiceLine[] = [];

  if (planType === "PEDIATRICS") {
    const rows = Array.isArray(data.organs) ? data.organs : [];
    for (const row of rows) {
      const r = row as { organId?: string; problem?: string; cost?: number };
      const amount = safeNumber(r.cost);
      if (amount <= 0) continue;
      const problem = trimText(r.problem);
      if (!problem) continue;
      const organ = trimText(r.organId) || "عضو";
      out.push({ description: `${organ} - ${problem}`, amount });
    }
  } else if (planType === "ORTHOPEDICS") {
    const rows = Array.isArray(data.injuries) ? data.injuries : [];
    for (const row of rows) {
      const r = row as { injuryType?: string; cost?: number };
      const amount = safeNumber(r.cost);
      if (amount <= 0) continue;
      const label = trimText(r.injuryType);
      if (!label) continue;
      out.push({ description: label, amount });
    }
  } else if (planType === "UROLOGY_NEPHROLOGY") {
    const rows = Array.isArray(data.issues) ? data.issues : [];
    for (const row of rows) {
      const r = row as { problem?: string; cost?: number };
      const amount = safeNumber(r.cost);
      if (amount <= 0) continue;
      const label = trimText(r.problem);
      if (!label) continue;
      out.push({ description: label, amount });
    }
  } else if (planType === "CARDIOLOGY") {
    const rows = Array.isArray(data.cardiac) ? data.cardiac : [];
    for (const row of rows) {
      const r = row as { zoneId?: string; problem?: string; cost?: number };
      const amount = safeNumber(r.cost);
      if (amount <= 0) continue;
      const problem = trimText(r.problem);
      if (!problem) continue;
      const zone = trimText(r.zoneId) || "منطقة";
      out.push({ description: `${zone} - ${problem}`, amount });
    }
  } else if (planType === "GENERIC" || planType === "DENTAL") {
    const rows = Array.isArray(data.items) ? data.items : [];
    for (const row of rows) {
      const r = row as { label?: string; detail?: string; cost?: number };
      const amount = safeNumber(r.cost);
      if (amount <= 0) continue;
      const label = trimText(r.label);
      const detail = trimText(r.detail);
      const description = label && detail ? `${label} - ${detail}` : label || detail;
      if (!description) continue;
      out.push({ description, amount });
    }
  }

  return out;
}
