import type { IntlFollowUpVisit } from "@/components/doctor-care-plans/clinical-intl-care-plan-config";
import { formatFollowUpLinesAr } from "./care-plan-follow-ups";

export const CARE_PLAN_PRINT_SITE_NAME_AR = "تابيبي";
export const CARE_PLAN_PRINT_SITE_NAME_EN = "Tabibi";
export const CARE_PLAN_PRINT_LOGO_PATH = "/88e178c9-facc-41a2-8f98-9252ccce19ee.png";
export const CARE_PLAN_PRINT_ORG_ADDRESS_AR = "الخليل، فلسطين";
/** تنسيق: رمز الدولة أولاً (LTR) */
export const CARE_PLAN_PRINT_ORG_PHONE = "+972 568541413";
export const CARE_PLAN_PRINT_ORG_EMAIL = "info@tabibi.ps";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function nl2brEscaped(text: string): string {
  return escapeHtml(text).replace(/\n/g, "<br/>");
}

export type CarePlanLetterheadPatient = {
  name: string;
  fileNumber?: string | null;
  recordId?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  guardian?: string | null;
};

export type CarePlanLetterheadSection = {
  titleAr: string;
  titleEn?: string;
  /** نص آمن بعد escapeHtml أو HTML جاهز من مصدر موثوق (صور base64 فقط من تطبيقنا) */
  bodyHtml: string;
};

export function buildCarePlanLetterheadHtml(opts: {
  origin: string;
  documentTitleAr: string;
  /** تاريخ ووقت إصدار المستند (يُعرض داخل بطاقة الترويسة) */
  issuedAtAr: string;
  doctor: { displayNameAr: string };
  patient: CarePlanLetterheadPatient;
  sections: CarePlanLetterheadSection[];
  followUpVisits: IntlFollowUpVisit[];
  recommendationsText?: string;
}): string {
  const logoUrl = `${opts.origin.replace(/\/$/, "")}${CARE_PLAN_PRINT_LOGO_PATH}`;
  const nextLines = formatFollowUpLinesAr(opts.followUpVisits);
  const nextBlock =
    nextLines.length > 0
      ? nextLines.map((l) => `<div class="nv-line">${escapeHtml(l)}</div>`).join("")
      : `<span class="muted">—</span>`;

  const rec =
    opts.recommendationsText?.trim() ?
      `<div class="sec-box rec-box">${nl2brEscaped(opts.recommendationsText.trim())}</div>`
    : `<div class="sec-box rec-box muted">—</div>`;

  const sectionsHtml = opts.sections
    .filter((s) => s.bodyHtml.trim().length > 0)
    .map(
      (s) => `
    <div class="sec">
      <div class="sec-title">${escapeHtml(s.titleAr)}${s.titleEn ? ` <span class="sec-title-en">${escapeHtml(s.titleEn)}</span>` : ""}</div>
      <div class="sec-box">${s.bodyHtml}</div>
    </div>`,
    )
    .join("");

  const pat = opts.patient;
  const dob = pat.dateOfBirth?.trim() || "—";
  const gen = pat.gender?.trim() || "—";
  const fn = pat.fileNumber?.trim() || "—";

  const emailEsc = escapeHtml(CARE_PLAN_PRINT_ORG_EMAIL);
  const phoneEsc = escapeHtml(CARE_PLAN_PRINT_ORG_PHONE);
  const issuedAtDisplay = opts.issuedAtAr?.trim() || "—";
  const issuedAtEsc = escapeHtml(issuedAtDisplay);

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
      line-height: 1.55;
      margin: 0;
      padding: 20px 24px 32px;
      background: #fff;
    }
    .sheet { max-width: 210mm; margin: 0 auto; }
    .hp {
      padding-bottom: 16px;
      border-bottom: 2px solid #1d4ed8;
      margin-bottom: 18px;
    }
    .hp-head {
      width: 100%;
      margin-bottom: 14px;
    }
    .hp-brand-row {
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      justify-content: space-between;
      gap: 20px 28px;
      width: 100%;
    }
    @media (max-width: 720px) {
      .doc-main-title { font-size: 1rem !important; }
    }
    .hp-logo-only {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
    }
    .hp-logo-only img {
      max-height: 128px;
      width: auto;
      max-width: min(100vw - 48px, 300px);
      display: block;
      object-fit: contain;
    }
    .doc-main-title {
      margin: 0;
      text-align: center;
      font-size: 2.65rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.15;
      padding: 0 8px;
      letter-spacing: -0.02em;
    }
    .hp-card {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 7px 11px;
      font-size: 0.74rem;
      line-height: 1.4;
      flex: 0 1 auto;
      width: fit-content;
      max-width: min(100%, 280px);
      min-width: 0;
      overflow: hidden;
      contain: layout;
    }
    .hp-card .hp-row {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 4px 8px;
      margin: 3px 0;
      justify-content: flex-start;
      width: 100%;
    }
    .hp-card .k { color: #475569; flex-shrink: 0; }
    .hp-card .ltr-inline {
      direction: ltr;
      unicode-bidi: embed;
      text-align: left;
      font-variant-numeric: tabular-nums;
    }
    .hp-card .email-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 8px;
      margin: 3px 0;
      justify-content: flex-start;
      width: 100%;
    }
    .hp-card .email-row .email-val {
      unicode-bidi: isolate;
      text-align: left;
      word-break: break-all;
    }
    /* منع «انسلاخ» الأرقام/LTR من تاريخ المستند بصرياً خارج البطاقة في RTL */
    .hp-card .hp-date-row {
      flex-wrap: nowrap;
      align-items: center;
    }
    .hp-card .hp-date-val {
      flex: 1 1 auto;
      min-width: 0;
      word-break: break-word;
    }
    .patient-block {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 20px;
      margin-bottom: 20px;
      font-size: 0.88rem;
    }
    @media (max-width: 640px) { .patient-block { grid-template-columns: 1fr; } }
    .pf { display: flex; flex-direction: column; gap: 2px; }
    .pf label { font-size: 0.72rem; color: #64748b; font-weight: 600; }
    .pf .line { border-bottom: 1px solid #cbd5e1; min-height: 22px; padding: 2px 0; }
    .sec { margin-top: 18px; page-break-inside: avoid; }
    .sec-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #b91c1c;
      margin-bottom: 6px;
    }
    .sec-title-en { font-size: 0.75rem; font-weight: 500; color: #94a3b8; }
    .sec-box {
      border: 2px dotted #94a3b8;
      border-radius: 6px;
      min-height: 100px;
      padding: 12px 14px;
      background: #fafafa;
      font-size: 0.88rem;
    }
    .rec-box { min-height: 72px; }
    table.print-tbl { width: 100%; border-collapse: collapse; font-size: 0.86rem; }
    table.print-tbl td { border: 1px solid #e2e8f0; padding: 6px 8px; vertical-align: top; }
    table.print-tbl td.l { width: 32%; font-weight: 600; background: #f8fafc; }
    .foot {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-end;
      gap: 24px;
      margin-top: 28px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
    }
    .next-visits { flex: 1; min-width: 200px; }
    .next-visits .lbl { font-size: 0.82rem; font-weight: 700; color: #b91c1c; margin-bottom: 6px; }
    .nv-line { font-size: 0.84rem; margin: 4px 0; padding: 4px 0; border-bottom: 1px dashed #e2e8f0; }
    .sig {
      min-width: 200px;
      text-align: center;
    }
    .sig .lbl { font-size: 0.82rem; font-weight: 700; margin-bottom: 28px; color: #111; }
    .sig .line { border-bottom: 1px solid #111; margin-bottom: 6px; min-height: 1px; }
    .sig .name { font-size: 0.8rem; color: #374151; }
    .muted { color: #9ca3af; font-style: italic; }
    .disclaimer {
      margin-top: 20px;
      font-size: 0.68rem;
      color: #9ca3af;
      font-style: italic;
      text-align: center;
    }
    @media print {
      /* هامش @page صفر: في Chrome/Edge تُزال عادة مساحة رأس/تذييل المتصفح (التاريخ، الرابط، رقم الصفحة) */
      @page {
        margin: 0;
        size: auto;
      }
      html {
        margin: 0;
        padding: 0;
        background: #fff;
      }
      body {
        margin: 0;
        padding: 12mm 14mm 16mm;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .sec-box { break-inside: avoid; }
      .hp-brand-row {
        flex-direction: row !important;
        flex-wrap: nowrap !important;
        align-items: center !important;
        justify-content: space-between !important;
      }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <header class="hp">
      <div class="hp-head">
        <h1 class="doc-main-title">${escapeHtml(opts.documentTitleAr)}</h1>
      </div>
      <div class="hp-brand-row">
        <div class="hp-logo-only">
          <img src="${escapeHtml(logoUrl)}" alt="" />
        </div>
        <div class="hp-card">
          <div class="hp-row hp-date-row">
            <span class="k">تاريخ المستند:</span>
            <bdi class="hp-date-val">${issuedAtEsc}</bdi>
          </div>
          <div class="hp-row">
            <span class="k">الاسم:</span>
            <span>${escapeHtml(opts.doctor.displayNameAr)}</span>
          </div>
          <div class="hp-row">
            <span class="k">الهاتف:</span>
            <span class="ltr-inline">${phoneEsc}</span>
          </div>
          <div class="email-row">
            <span class="k">البريد:</span>
            <span dir="ltr" class="email-val">${emailEsc}</span>
          </div>
          <div class="hp-row">
            <span class="k">العنوان:</span>
            <span>${escapeHtml(CARE_PLAN_PRINT_ORG_ADDRESS_AR)}</span>
          </div>
        </div>
      </div>
    </header>

    <div class="patient-block">
      <div class="pf">
        <label>اسم المريض</label>
        <div class="line">${escapeHtml(pat.name || "—")}</div>
      </div>
      <div class="pf">
        <label>الجنس</label>
        <div class="line">${escapeHtml(gen)}</div>
      </div>
      <div class="pf">
        <label>رقم الملف / المرجع</label>
        <div class="line">${escapeHtml(fn)}</div>
      </div>
      <div class="pf">
        <label>تاريخ الميلاد</label>
        <div class="line">${escapeHtml(dob)}</div>
      </div>
    </div>

    ${sectionsHtml}

    ${opts.recommendationsText?.trim() ? `
    <div class="sec">
      <div class="sec-title">التوصيات وملاحظات الطبيب <span class="sec-title-en">Recommendations</span></div>
      <div class="sec-box rec-box">${nl2brEscaped(opts.recommendationsText.trim())}</div>
    </div>
    ` : ""}

    <div class="foot">
      ${opts.followUpVisits.length > 0 ? `
      <div class="next-visits">
        <div class="lbl">الزيارة القادمة</div>
        ${nextBlock}
      </div>
      ` : ""}
      <div class="sig">
        <div class="lbl">توقيع الطبيب</div>
        <div class="line"></div>
        <div class="name">${escapeHtml(opts.doctor.displayNameAr)}</div>
      </div>
    </div>

    <p class="disclaimer">هذه الوثيقة لا تُعتد بها دون توقيع الطبيب المعالج.</p>
  </div>
</body>
</html>`;
}

/** يبني أقساماً من جدول صفوف (تشخيص/خطة) لاستخدامها داخل sec-box */
export function tableRowsToHtml(rowsHtml: string): string {
  if (!rowsHtml.trim()) return `<p class="muted">—</p>`;
  return `<table class="print-tbl">${rowsHtml}</table>`;
}
