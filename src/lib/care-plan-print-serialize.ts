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
  const row = (label: string, value: string | number | null | undefined) => {
    const v =
      value == null || (typeof value === "string" && !value.trim())
        ? "—"
        : typeof value === "string"
          ? escapeHtml(value.trim())
          : escapeHtml(String(value));
    return `<tr><td class="l">${escapeHtml(label)}</td><td>${v}</td></tr>`;
  };
  const rowMultiline = (label: string, value: string | null | undefined) => {
    const v = value?.trim() ? nl2brEscaped(value.trim()) : `<span class="muted">—</span>`;
    return `<tr><td class="l">${escapeHtml(label)}</td><td>${v}</td></tr>`;
  };

  switch (carePlanType) {
    case "OB_GYN": {
      const lmp = (data.lmpDate as string) || "";
      const reviewVisits = (data.reviewVisits as { id: string; date: string; note?: string }[]) || [];
      
      if (lmp) {
        let bodyPregnancy = "";
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
        if (bodyPregnancy) {
          sections.push({
            titleAr: "متابعة الحمل",
            titleEn: "Pregnancy follow-up",
            bodyHtml: bodyPregnancy,
          });
        }
      }

      if (reviewVisits.length > 0) {
        const visitsList = `<ul style="margin:0;padding-right:18px">${reviewVisits
          .map(
            (v) =>
              `<li>${escapeHtml(v.date)}${v.note?.trim() ? ` — ${escapeHtml(v.note)}` : ""}</li>`,
          )
          .join("")}</ul>`;
        sections.push({
          titleAr: "مراجعات المواعيد",
          titleEn: "Review visits",
          bodyHtml: visitsList,
        });
      }
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
      if (rows) {
        sections.push({
          titleAr: "الأعضاء والمشكلات",
          titleEn: "Organs & issues",
          bodyHtml: `<table class="print-tbl">${rows}</table>`,
        });
      }
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
      if (rows) {
        sections.push({
          titleAr: "الإصابات والعلاج",
          titleEn: "Injuries",
          bodyHtml: `<table class="print-tbl">${rows}</table>`,
        });
      }
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
      if (rows) {
        sections.push({
          titleAr: "المسالك والكلى",
          titleEn: "Urology",
          bodyHtml: `<table class="print-tbl">${rows}</table>`,
        });
      }
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
      if (rows) {
        sections.push({
          titleAr: "مناطق القلب والتشخيص",
          titleEn: "Cardiac zones",
          bodyHtml: `<table class="print-tbl">${rows}</table>`,
        });
      }
      break;
    }
    case "DENTAL_IMPLANT_IMMEDIATE_SURGICAL":
    case "DENTAL_IMPLANT_COSMETIC": {
      sections.push({
        titleAr: CARE_PLAN_LABELS[carePlanType],
        titleEn: "Dental implant plan",
        bodyHtml: `<p class="muted">تفاصيل كل سنّ (الرقم والإجراء) تظهر في الجدول في الاسفل.</p>`,
      });
      break;
    }
    case "NUTRITION": {
      const anth = data.anthropometrics as
        | { heightCm?: number; weightKg?: number; history?: unknown[] }
        | undefined;
      const np = data.nutritionPlan as Record<string, unknown> | undefined;
      const lines: string[] = [];
      if (anth && (anth.heightCm || anth.weightKg)) {
        lines.push(
          `<p><strong>الطول / الوزن:</strong> ${anth.heightCm ?? "—"} سم — ${anth.weightKg ?? "—"} كغ</p>`,
        );
      }
      if (np && Object.keys(np).length) {
        lines.push(`<p class="mt-2 font-semibold">التغذية</p><pre style="white-space:pre-wrap;font-size:0.78rem">${escapeHtml(JSON.stringify(np, null, 2))}</pre>`);
      }
      if (lines.length > 0) {
        sections.push({
          titleAr: CARE_PLAN_LABELS[carePlanType],
          titleEn: "Nutrition plan",
          bodyHtml: lines.join(""),
        });
      }
      break;
    }
    case "DERMATOLOGY_LASER": {
      const dp = data.dermatologyPlan as Record<string, unknown> | undefined;
      const lines: string[] = [];
      if (dp && Object.keys(dp).length) {
        lines.push(`<pre style="white-space:pre-wrap;font-size:0.78rem">${escapeHtml(JSON.stringify(dp, null, 2))}</pre>`);
      }
      if (lines.length > 0) {
        sections.push({
          titleAr: CARE_PLAN_LABELS[carePlanType],
          titleEn: "Dermatology & laser plan",
          bodyHtml: lines.join(""),
        });
      }
      break;
    }
    case "DERMATOLOGY_HAIR_TRANSPLANT": {
      const dp = (data.dermatologyPlan as Record<string, unknown>) || {};
      const focus = (data.planFocus as string) || "";
      const showSkin = focus === "skin" || !focus;
      const showHair = focus === "hair" || !focus;

      const focusLine =
        focus === "skin"
          ? `<p><strong>نوع الخطة:</strong> البشرة</p>`
          : focus === "hair"
            ? `<p><strong>نوع الخطة:</strong> الشعر / زراعة الشعر</p>`
            : ``;

      const tables: string[] = [];
      if (focusLine) tables.push(focusLine);

      if (showSkin) {
        const rowsArr = [
          [data.skinPhototype as string | undefined, "فوتوتايب البشرة"],
          [(dp.chiefComplaints as string | undefined) ?? "", "الشكوى / التشخيص المبدئي"],
          [(dp.topicalProtocol as string | undefined) ?? "", "البروتوكول الموضعي"],
          [(dp.sunProtection as string | undefined) ?? "", "واقي الشمس"],
          [(dp.contraindications as string | undefined) ?? "", "موانع / تحذيرات"],
          [(dp.otherProcedures as string | undefined) ?? "", "إجراءات أخرى"],
        ].filter(([val]) => (typeof val === "string" ? val.trim() : val != null));

        if (rowsArr.length > 0) {
          const skinRows = rowsArr.map(([v, l]) => {
            const labelStr = String(l);
            return (labelStr.includes("الشكوى") || labelStr.includes("البروتوكول") || labelStr.includes("موانع") || labelStr.includes("إجراءات")) 
              ? rowMultiline(labelStr, String(v)) 
              : row(labelStr, String(v));
          }).join("");
          tables.push(`<p class="mt-2 font-semibold">خطة البشرة</p><table class="print-tbl">${skinRows}</table>`);
        }
      }

      if (showHair) {
        const rowsArr = [
          [(dp.hairDiagnosis as string | undefined) ?? "", "تشخيص الشعر / سبب التساقط"],
          [dp.hairLossPattern as string | undefined, "نمط التساقط (Norwood/Ludwig)"],
          [dp.plannedTechnique as string | undefined, "التقنية المخططة"],
          [(dp.graftsTarget as number | undefined) ?? null, "عدد البصيلات المستهدف"],
          [dp.donorArea as string | undefined, "منطقة التبرع"],
          [(dp.preOpPlan as string | undefined) ?? "", "خطة قبل العملية"],
          [(dp.postOpPlan as string | undefined) ?? "", "خطة بعد العملية"],
        ].filter(([val]) => (typeof val === "string" ? val.trim() : val != null));

        if (rowsArr.length > 0) {
          const hairRows = rowsArr.map(([v, l]) => {
            const labelStr = String(l);
            return (labelStr.includes("تشخيص") || labelStr.includes("قبل") || labelStr.includes("بعد")) 
              ? rowMultiline(labelStr, String(v)) 
              : row(labelStr, String(v));
          }).join("");
          tables.push(`<p class="mt-2 font-semibold">خطة الشعر / زراعة الشعر</p><table class="print-tbl">${hairRows}</table>`);
        }
      }

      if (tables.length > 0) {
        sections.push({
          titleAr: CARE_PLAN_LABELS[carePlanType],
          titleEn: "Hair transplant & dermatology",
          bodyHtml: tables.join(""),
        });
      }
      break;
    }
    case "NUTRITION_DERMATOLOGY": {
      const anth = data.anthropometrics as
        | { heightCm?: number; weightKg?: number; history?: unknown[] }
        | undefined;
      const np = data.nutritionPlan as Record<string, unknown> | undefined;
      const dp = data.dermatologyPlan as Record<string, unknown> | undefined;
      const focus = (data.planFocus as string) || "";
      const lines: string[] = [];
      if (focus === "nutrition") {
        lines.push(`<p><strong>نوع الخطة:</strong> التغذية العلاجية</p>`);
      } else if (focus === "dermatology") {
        lines.push(`<p><strong>نوع الخطة:</strong> البشرة والليزر</p>`);
      } else if (focus === "both") {
        lines.push(`<p><strong>نوع الخطة (قديم):</strong> مدمج</p>`);
      }

      const showNutSide = focus === "nutrition" || focus === "both";
      const showDermSide = focus === "dermatology" || focus === "both";
      const showFallbackSides =
        focus !== "nutrition" && focus !== "dermatology" && focus !== "both";

      if (showNutSide || showFallbackSides) {
        if (anth && (anth.heightCm || anth.weightKg)) {
          lines.push(
            `<p><strong>الطول / الوزن:</strong> ${anth.heightCm ?? "—"} سم — ${anth.weightKg ?? "—"} كغ</p>`,
          );
        }
        if (np && Object.keys(np).length) {
          lines.push(
            `<p class="mt-2 font-semibold">التغذية</p><pre style="white-space:pre-wrap;font-size:0.78rem">${escapeHtml(JSON.stringify(np, null, 2))}</pre>`,
          );
        }
      }
      if (showDermSide || showFallbackSides) {
        if (dp && Object.keys(dp).length) {
          lines.push(
            `<p class="mt-2 font-semibold">البشرة والليزر</p><pre style="white-space:pre-wrap;font-size:0.78rem">${escapeHtml(JSON.stringify(dp, null, 2))}</pre>`,
          );
        }
      }
      if (lines.length > 0) {
        sections.push({
          titleAr: CARE_PLAN_LABELS[carePlanType],
          titleEn: "Nutrition / dermatology plan",
          bodyHtml: lines.join(""),
        });
      }
      break;
    }
    case "GENERAL_MEDICINE": {
      const items = (data.items as any[]) || [];
      const totalCost = items.reduce((sum, it) => sum + (Number(it.cost) || 0), 0);
      const rows = items.length > 0 ? items.map(it => `
        <tr>
          <td>${escapeHtml(String(it.label || "—"))}</td>
          <td style="text-align:center">${it.cost != null ? `${escapeHtml(String(it.cost))} ₪` : "—"}</td>
        </tr>
      `).join("") : "";

      const itemsTable = rows ? `
        <table class="print-tbl">
          <thead>
            <tr style="background:#f9fafb">
              <th style="padding:8px;font-size:0.75rem;text-align:right">البند / وصف العلاج</th>
              <th style="padding:8px;font-size:0.75rem;text-align:center">التكلفة (₪)</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
          <tfoot>
            <tr style="background:#f0f9ff;font-weight:bold">
              <td style="padding:8px;text-align:left">الإجمالي (Total Cost):</td>
              <td style="padding:8px;text-align:center;font-size:1rem;color:#0369a1">₪${totalCost.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      ` : "";

      const diagRows = [
        data.icd10Code && row("ICD-10 Code", data.icd10Code as string),
        data.severity && row("حالة المرض", data.severity as string),
      ].filter(Boolean).join("");

      if (diagRows) {
        sections.push({
          titleAr: "التشخيص والحدة",
          titleEn: "Diagnosis & Severity",
          bodyHtml: `<table class="print-tbl">${diagRows}</table>`
        });
      }

      const prescriptions = (data.prescriptions as any[]) || [];
      const prRows = prescriptions.length > 0 ? prescriptions.map(pr => `
        <tr>
          <td>${escapeHtml(String(pr.drug || "—"))}</td>
          <td>${escapeHtml(String(pr.dosage || "—"))}</td>
          <td>${escapeHtml(String(pr.freq || "—"))}</td>
          <td>${escapeHtml(String(pr.duration || "—"))}</td>
        </tr>
      `).join("") : "";

      if (prRows) {
        sections.push({
          titleAr: "الوصفة الطبية",
          titleEn: "Prescription (Rx)",
          bodyHtml: `
            <table class="print-tbl">
              <thead>
                <tr style="background:#f0f9ff">
                  <th style="padding:8px;font-size:0.75rem;text-align:right">الدواء</th>
                  <th style="padding:8px;font-size:0.75rem;text-align:right">الجرعة</th>
                  <th style="padding:8px;font-size:0.75rem;text-align:right">التكرار</th>
                  <th style="padding:8px;font-size:0.75rem;text-align:right">المدة</th>
                </tr>
              </thead>
              <tbody>
                ${prRows}
              </tbody>
            </table>
          `
        });
      }

      if (itemsTable) {
        sections.push({
          titleAr: "بنود العلاج والتكلفة",
          titleEn: "Treatment & Costs",
          bodyHtml: itemsTable
        });
      }

      const labTests = (data.labTests as string) || "";
      if (labTests.trim()) {
        sections.push({
          titleAr: "الفحوصات المطلوبة",
          titleEn: "Diagnostics",
          bodyHtml: `<table class="print-tbl">${rowMultiline("الفحوصات المخبرية", labTests)}</table>`
        });
      }

      if (data.lifestyleAdvice) {
        sections.push({
          titleAr: "نصائح نمط الحياة",
          titleEn: "Lifestyle Advice",
          bodyHtml: nl2brEscaped(data.lifestyleAdvice as string)
        });
      }

      if (data.redFlags) {
        sections.push({
          titleAr: "علامات الخطر",
          titleEn: "Red Flags",
          bodyHtml: `<div style="color:#e11d48;font-weight:600">${nl2brEscaped(data.redFlags as string)}</div>`
        });
      }
      break;
    }
    case "MEDICAL_REPORT": {
      const historyRows = [
        data.presentingComplaints && rowMultiline("الشكوى الرئيسية (Complaints)", data.presentingComplaints as string),
        data.medicalHistory && rowMultiline("التاريخ الطبي (Medical History)", data.medicalHistory as string),
      ].filter(Boolean).join("");

      if (historyRows) {
        sections.push({
          titleAr: "التاريخ المرضي",
          titleEn: "Clinical History",
          bodyHtml: `<table class="print-tbl">${historyRows}</table>`
        });
      }

      const examParts = [
        data.bp && `ضغط الدم: ${data.bp}`,
        data.temp && `الحرارة: ${data.temp}`,
        data.pulse && `النبض: ${data.pulse}`,
      ].filter(Boolean).join(" | ");

      if (examParts || data.physicalExamination) {
        sections.push({
          titleAr: "الفحص السريري",
          titleEn: "Physical Examination",
          bodyHtml: `
            ${examParts ? `<p style="margin-bottom:8px;font-weight:bold">${escapeHtml(examParts)}</p>` : ""}
            ${data.physicalExamination ? nl2brEscaped(data.physicalExamination as string) : ""}
          `
        });
      }

      if (data.investigations) {
        sections.push({
          titleAr: "النتائج المخبرية والشعاعية",
          titleEn: "Investigations",
          bodyHtml: nl2brEscaped(data.investigations as string)
        });
      }

      const diagnosisRows = [
        data.diagnosis && row("التشخيص (Diagnosis)", data.diagnosis as string),
        data.icd10 && row("ICD-10 Code", data.icd10 as string),
      ].filter(Boolean).join("");

      if (diagnosisRows) {
        sections.push({
          titleAr: "الاستنتاج الطبي والتشخيص",
          titleEn: "Clinical Impression & Diagnosis",
          bodyHtml: `<table class="print-tbl">${diagnosisRows}</table>`
        });
      }

      const recommendations = data.recommendations ? nl2brEscaped(data.recommendations as string) : "";
      const sickLeaveDays = Number(data.sickLeaveDays) || 0;
      const sickLeaveNotes = data.sickLeaveNotes as string;

      let recHtml = recommendations;
      if (sickLeaveDays > 0) {
        recHtml += `
          <div style="margin-top:12px;padding:10px;border:1px solid #fda4af;background:#fff1f2;border-radius:6px">
            <p style="margin:0;font-weight:bold;color:#be123c">الإجازة المرضية (Sick Leave):</p>
            <p style="margin:4px 0 0;font-size:1rem">يُنصح براحة لمدة <b>${sickLeaveDays}</b> أيام.</p>
            ${sickLeaveNotes ? `<p style="margin:4px 0 0;font-size:0.8rem;color:#475569">${escapeHtml(sickLeaveNotes)}</p>` : ""}
          </div>
        `;
      }

      if (recHtml) {
        sections.push({
          titleAr: "التوصيات الطبية",
          titleEn: "Recommendations",
          bodyHtml: recHtml
        });
      }
      break;
    }
    case "GENERIC":
    case "DENTAL": {
      const items = (data.items as { label: string; detail: string; cost: number }[]) || [];
      const rows = items
        .filter((r) => r.label?.trim() || r.detail?.trim())
        .map((r) => {
          const detail = escapeHtml(r.detail || "—");
          if (carePlanType === "DENTAL") {
            return `<tr><td class="l">${escapeHtml(r.label || "—")}</td><td>${detail}</td></tr>`;
          }
          return `<tr><td class="l">${escapeHtml(r.label || "—")}</td><td>${detail}${r.cost ? ` — <span dir="ltr">${r.cost} ₪</span>` : ""}</td></tr>`;
        })
        .join("");
      
      if (rows) {
        const titleEn = carePlanType === "GENERIC" ? "General plan" : "Dental plan";
        sections.push({
          titleAr: CARE_PLAN_LABELS[carePlanType],
          titleEn,
          bodyHtml: `<table class="print-tbl">${rows}</table>`,
        });
      }
      break;
    }
    default: {
      const label = CARE_PLAN_LABELS[carePlanType] ?? "خطة العلاج";
      const jsonBody = JSON.stringify(stripForJson(data), null, 2);
      if (jsonBody !== "{}") {
        sections.push({
          titleAr: label,
          titleEn: "Care plan data",
          bodyHtml: `<pre style="white-space:pre-wrap;font-size:0.78rem;font-family:inherit;margin:0">${escapeHtml(jsonBody)}</pre>`,
        });
      }
    }
  }

  return sections;
}
