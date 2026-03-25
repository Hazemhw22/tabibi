import { addDays, differenceInDays, format } from "date-fns";
import { ar } from "date-fns/locale";
import type { CarePlanType } from "@/lib/specialty-plan-registry";
import { CARE_PLAN_LABELS } from "@/lib/specialty-plan-registry";
import { escapeHtml, nl2brEscaped, type CarePlanLetterheadSection } from "@/lib/care-plan-print-html";

function stripForJson(data: Record<string, unknown>): Record<string, unknown> {
  const o = { ...data };
  delete o.images;
  if (o.intlClinical && typeof o.intlClinical === "object") {
    const ic = { ...(o.intlClinical as Record<string, unknown>) };
    for (const k of Object.keys(ic)) {
      const s = ic[k];
      if (s && typeof s === "object" && !Array.isArray(s)) {
        const copy = { ...(s as Record<string, unknown>) };
        delete copy.followUpVisits;
        ic[k] = copy;
      }
    }
    o.intlClinical = ic;
  }
  return o;
}

/**
 * أقسام الطباعة للتخصصات التي لا تستخدم نموذج intl/جنين المدمج.
 */
export function serializeCarePlanSectionsForPrint(
  carePlanType: CarePlanType,
  data: Record<string, unknown>,
): CarePlanLetterheadSection[] {
  const sections: CarePlanLetterheadSection[] = [];

  switch (carePlanType) {
    case "OB_GYN": {
      const lmp = (data.lmpDate as string) || "";
      const reviewVisits = (data.reviewVisits as { id: string; date: string; note?: string }[]) || [];
      let bodyPregnancy = "";
      if (lmp) {
        const start = new Date(`${lmp}T12:00:00`);
        if (!Number.isNaN(start.getTime())) {
          const today = new Date();
          const days = differenceInDays(today, start);
          if (days >= 0) {
            const weeks = Math.floor(days / 7);
            const daysR = days % 7;
            const edd = addDays(start, 280);
            bodyPregnancy = nl2brEscaped(
              `أول يوم آخر دورة (LMP): ${lmp}\nعمر الحمل: ${weeks} أسبوعاً${daysR ? ` و ${daysR} يوماً` : ""}\nالتاريخ المتوقع للولادة: ${format(edd, "d MMMM yyyy", { locale: ar })}`,
            );
          }
        }
      }
      sections.push({
        titleAr: "متابعة الحمل",
        titleEn: "Pregnancy follow-up",
        bodyHtml: bodyPregnancy || `<p class="muted">—</p>`,
      });
      const visitsList =
        reviewVisits.length > 0 ?
          `<ul style="margin:0;padding-right:18px">${reviewVisits
            .map(
              (v) =>
                `<li>${escapeHtml(v.date)}${v.note?.trim() ? ` — ${escapeHtml(v.note)}` : ""}</li>`,
            )
            .join("")}</ul>`
        : `<p class="muted">—</p>`;
      sections.push({
        titleAr: "مراجعات المواعيد",
        titleEn: "Review visits",
        bodyHtml: visitsList,
      });
      break;
    }
    case "PEDIATRICS": {
      const organs = (data.organs as { organId: string; problem: string; cost: number }[]) || [];
      const rows = organs
        .filter((r) => r.problem?.trim())
        .map(
          (r) =>
            `<tr><td class="l">${escapeHtml(r.organId)}</td><td>${escapeHtml(r.problem)}${r.cost ? ` <span dir="ltr">(${r.cost} ₪)</span>` : ""}</td></tr>`,
        )
        .join("");
      sections.push({
        titleAr: "الأعضاء والمشكلات",
        titleEn: "Organs & issues",
        bodyHtml: rows ? `<table class="print-tbl">${rows}</table>` : `<p class="muted">—</p>`,
      });
      break;
    }
    case "ORTHOPEDICS": {
      const injuries = (data.injuries as { injuryType: string; durationDays: number; cost: number }[]) || [];
      const rows = injuries
        .filter((r) => r.injuryType?.trim())
        .map(
          (r) =>
            `<tr><td class="l">${escapeHtml(r.injuryType)}</td><td>المدة: ${r.durationDays} يوماً${r.cost ? ` — <span dir="ltr">${r.cost} ₪</span>` : ""}</td></tr>`,
        )
        .join("");
      sections.push({
        titleAr: "الإصابات والعلاج",
        titleEn: "Injuries",
        bodyHtml: rows ? `<table class="print-tbl">${rows}</table>` : `<p class="muted">—</p>`,
      });
      break;
    }
    case "UROLOGY_NEPHROLOGY": {
      const issues = (data.issues as { problem: string; cost: number }[]) || [];
      const rows = issues
        .filter((r) => r.problem?.trim())
        .map(
          (r) =>
            `<tr><td class="l">${escapeHtml(r.problem)}</td><td>${r.cost ? `<span dir="ltr">${r.cost} ₪</span>` : "—"}</td></tr>`,
        )
        .join("");
      sections.push({
        titleAr: "المسالك والكلى",
        titleEn: "Urology",
        bodyHtml: rows ? `<table class="print-tbl">${rows}</table>` : `<p class="muted">—</p>`,
      });
      break;
    }
    case "CARDIOLOGY": {
      const cardiac = (data.cardiac as { zoneId: string; problem: string; cost: number }[]) || [];
      const rows = cardiac
        .filter((r) => r.problem?.trim())
        .map(
          (r) =>
            `<tr><td class="l">${escapeHtml(r.zoneId)}</td><td>${escapeHtml(r.problem)}${r.cost ? ` — <span dir="ltr">${r.cost} ₪</span>` : ""}</td></tr>`,
        )
        .join("");
      sections.push({
        titleAr: "مناطق القلب والتشخيص",
        titleEn: "Cardiac zones",
        bodyHtml: rows ? `<table class="print-tbl">${rows}</table>` : `<p class="muted">—</p>`,
      });
      break;
    }
    case "GENERIC":
    case "DENTAL": {
      const items = (data.items as { label: string; detail: string; cost: number }[]) || [];
      const rows = items
        .filter((r) => r.label?.trim() || r.detail?.trim())
        .map(
          (r) =>
            `<tr><td class="l">${escapeHtml(r.label || "—")}</td><td>${escapeHtml(r.detail || "—")}${r.cost ? ` — <span dir="ltr">${r.cost} ₪</span>` : ""}</td></tr>`,
        )
        .join("");
      sections.push({
        titleAr: CARE_PLAN_LABELS[carePlanType],
        titleEn: carePlanType === "DENTAL" ? "Dental plan" : "General plan",
        bodyHtml: rows ? `<table class="print-tbl">${rows}</table>` : `<p class="muted">—</p>`,
      });
      break;
    }
    default: {
      const label = CARE_PLAN_LABELS[carePlanType] ?? "خطة العلاج";
      sections.push({
        titleAr: label,
        titleEn: "Care plan data",
        bodyHtml: `<pre style="white-space:pre-wrap;font-size:0.78rem;font-family:inherit;margin:0">${escapeHtml(
          JSON.stringify(stripForJson(data), null, 2),
        )}</pre>`,
      });
    }
  }

  return sections;
}
