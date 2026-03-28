/**
 * تقرير مالي للطباعة / «حفظ كـ PDF» عبر نافذة الطباعة — HTML ثابت بألوان hex فقط
 * (نفس أسلوب خطة العلاج، بدون html2canvas لتجنب أخطاء lab/oklch).
 */

import { escapeHtml } from "@/lib/care-plan-print-html";
import { formatSignedShekel } from "@/lib/money-display";
import { ledgerBalance, transactionSignedDelta } from "@/lib/patient-transaction-math";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export type FinancialReportPrintMode = "multi-patient" | "single-patient";

export type FinancialReportPrintRowInput = {
  date: string;
  type: "SERVICE" | "PAYMENT";
  description: string;
  /** ملاحظات المعاملة (اختياري) */
  notes?: string | null;
  amount: number;
  /** وضع التقارير العامة فقط */
  patientName?: string;
  source?: string;
};

export function buildFinancialReportPrintHtml(opts: {
  mode: FinancialReportPrintMode;
  doctorName: string;
  /** عنوان المريض أو «جميع المرضى» */
  patientLine: string;
  issuedAtLabel: string;
  searchNote?: string;
  /** في وضع مريض واحد: عيادة / منصة */
  patientChannelLabel?: string;
  rows: FinancialReportPrintRowInput[];
}): string {
  const balance = ledgerBalance(
    opts.rows.map((r) => ({ type: r.type, amount: r.amount }))
  );

  const multi = opts.mode === "multi-patient";

  const rowsHtml = opts.rows
    .map((r) => {
      const signed = transactionSignedDelta({ type: r.type, amount: r.amount });
      const amtText = formatSignedShekel(signed);
      const typeLabel = r.type === "PAYMENT" ? "دفعة" : "خدمة";
      const typeBg = r.type === "PAYMENT" ? "#dcfce7" : "#fee2e2";
      const typeFg = r.type === "PAYMENT" ? "#15803d" : "#b91c1c";
      const amtColor = signed >= 0 ? "#059669" : "#dc2626";
      const dateStr = r.date
        ? format(new Date(r.date), "d MMM yyyy", { locale: ar })
        : "—";
      const descParts = [r.description?.trim(), r.notes?.trim()].filter(Boolean);
      const descEsc = escapeHtml(descParts.join(" — ") || "—");

      if (multi) {
        return `<tr>
  <td>${escapeHtml(dateStr)}</td>
  <td>${escapeHtml(r.patientName ?? "—")}</td>
  <td><span class="tg" style="background:${typeBg};color:${typeFg}">${escapeHtml(typeLabel)}</span></td>
  <td class="td-desc">${descEsc}</td>
  <td class="amt" style="color:${amtColor}">${escapeHtml(amtText)}</td>
  <td>${escapeHtml(r.source ?? "—")}</td>
</tr>`;
      }
      return `<tr>
  <td>${escapeHtml(dateStr)}</td>
  <td class="td-desc">${descEsc}</td>
  <td><span class="tg" style="background:${typeBg};color:${typeFg}">${escapeHtml(typeLabel)}</span></td>
  <td class="amt" style="color:${amtColor}">${escapeHtml(amtText)}</td>
</tr>`;
    })
    .join("\n");

  const balanceColor = balance >= 0 ? "#059669" : "#dc2626";
  const balanceText = escapeHtml(formatSignedShekel(balance));

  const thead = multi
    ? `<thead><tr>
  <th>التاريخ</th>
  <th>المريض</th>
  <th>النوع</th>
  <th>الوصف</th>
  <th>المبلغ</th>
  <th>المصدر</th>
</tr></thead>`
    : `<thead><tr>
  <th>التاريخ</th>
  <th>البيان</th>
  <th>النوع</th>
  <th>المبلغ</th>
</tr></thead>`;

  const colSpan = multi ? 4 : 3;
  const foot = `<tfoot><tr class="foot">
  <td colspan="${colSpan}">رصيد المعروض (سالب = دين على المريض)</td>
  <td class="amt" style="color:${balanceColor}">${balanceText}</td>
  ${multi ? "<td></td>" : ""}
</tr></tfoot>`;

  const searchBlock = opts.searchNote?.trim()
    ? `<p class="muted">بحث: ${escapeHtml(opts.searchNote.trim())}</p>`
    : "";

  const channelBlock =
    opts.patientChannelLabel?.trim() ?
      `<p class="muted">المسار: ${escapeHtml(opts.patientChannelLabel.trim())}</p>`
    : "";

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8"/>
  <title>&#8203;</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, 'Arial Unicode MS', Arial, sans-serif;
      color: #111827;
      line-height: 1.5;
      margin: 0;
      padding: 20px 24px 32px;
      background: #ffffff;
    }
    .sheet { max-width: 210mm; margin: 0 auto; }
    h1 { font-size: 1.15rem; margin: 0 0 8px; color: #0f172a; }
    .meta { font-size: 0.875rem; color: #374151; margin: 4px 0; }
    .muted { font-size: 0.8rem; color: #6b7280; margin: 6px 0 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      font-size: 0.875rem;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 8px 10px;
      text-align: right;
      vertical-align: top;
    }
    th { background: #f9fafb; color: #4b5563; font-weight: 600; }
    .td-desc { word-break: break-word; }
    .tg {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .amt { font-weight: 700; white-space: nowrap; }
    tfoot .foot td { background: #f3f4f6; font-weight: 600; }
    tfoot .foot .amt { font-size: 1rem; }
  </style>
</head>
<body>
  <div class="sheet">
    <h1>تقرير الخدمات والدفعات</h1>
    <p class="meta">الطبيب: ${escapeHtml(opts.doctorName.trim() || "—")}</p>
    <p class="meta">المريض / النطاق: ${escapeHtml(opts.patientLine)}</p>
    ${channelBlock}
    <p class="meta">تاريخ الإصدار: ${escapeHtml(opts.issuedAtLabel)}</p>
    ${searchBlock}
    <table>
      ${thead}
      <tbody>
        ${rowsHtml}
      </tbody>
      ${foot}
    </table>
  </div>
</body>
</html>`;
}
