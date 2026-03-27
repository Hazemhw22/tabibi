import { carePlanUsesItemsCostGrid, type CarePlanType } from "@/lib/specialty-plan-registry";

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
  if (carePlanUsesItemsCostGrid(planType)) normalizeRows("items");

  // احتياط: أي نوع يعرض تكلفة في الواجهة تحت هذه المفاتيح
  normalizeRows("organs");
  normalizeRows("injuries");
  normalizeRows("issues");
  normalizeRows("cardiac");
  normalizeRows("items");

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
      const organ = trimText(r.organId) || "عضو";
      const description = problem ? `${organ} - ${problem}` : organ;
      out.push({ description, amount });
    }
  } else if (planType === "ORTHOPEDICS") {
    const rows = Array.isArray(data.injuries) ? data.injuries : [];
    for (const row of rows) {
      const r = row as { injuryType?: string; cost?: number };
      const amount = safeNumber(r.cost);
      if (amount <= 0) continue;
      const label = trimText(r.injuryType);
      out.push({ description: label || "خدمة عظام", amount });
    }
  } else if (planType === "UROLOGY_NEPHROLOGY") {
    const rows = Array.isArray(data.issues) ? data.issues : [];
    for (const row of rows) {
      const r = row as { problem?: string; cost?: number };
      const amount = safeNumber(r.cost);
      if (amount <= 0) continue;
      const label = trimText(r.problem);
      out.push({ description: label || "خدمة مسالك", amount });
    }
  } else if (planType === "CARDIOLOGY") {
    const rows = Array.isArray(data.cardiac) ? data.cardiac : [];
    for (const row of rows) {
      const r = row as { zoneId?: string; problem?: string; cost?: number };
      const amount = safeNumber(r.cost);
      if (amount <= 0) continue;
      const problem = trimText(r.problem);
      const zone = trimText(r.zoneId) || "منطقة";
      const description = problem ? `${zone} - ${problem}` : `${zone} - خدمة`;
      out.push({ description, amount });
    }
  } else if (carePlanUsesItemsCostGrid(planType)) {
    const rows = Array.isArray(data.items) ? data.items : [];
    for (const row of rows) {
      const r = row as { label?: string; detail?: string; cost?: number };
      const amount = safeNumber(r.cost);
      if (amount <= 0) continue;
      const label = trimText(r.label);
      const detail = trimText(r.detail);
      const description =
        label && detail ? `${label} - ${detail}` : label || detail || "بند من خطة العلاج";
      out.push({ description, amount });
    }
  }

  // أي نوع خطة يخزن بنود `items` + تكلفة (مثلاً احتياط التخصص العام على أنواع غير مذكورة صراحة).
  if (out.length === 0 && Array.isArray(data.items)) {
    for (const row of data.items) {
      const r = row as { label?: string; detail?: string; cost?: number };
      const amount = safeNumber(r.cost);
      if (amount <= 0) continue;
      const label = trimText(r.label);
      const detail = trimText(r.detail);
      const description =
        label && detail ? `${label} - ${detail}` : label || detail || "بند من خطة العلاج";
      out.push({ description, amount });
    }
  }

  return out;
}
