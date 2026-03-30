import { escapeHtml, nl2brEscaped } from "@/lib/care-plan-print-html";

export type MedicalReportPrintPatient = {
  name: string;
  fileNumber?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
};

export type MedicalReportPrintNote = {
  allergies?: string | null;
  diagnosis?: string | null;
  treatment?: string | null;
  createdAt?: string | null;
};

export function buildMedicalReportPrintHtml(opts: {
  doctorName: string;
  clinicName?: string | null;
  issuedAtLabel: string;
  reportTitle?: string;
  patient: MedicalReportPrintPatient;
  note: MedicalReportPrintNote;
}): string {
  const title = (opts.reportTitle ?? "تقرير طبي").trim() || "تقرير طبي";
  const issuedAt = opts.issuedAtLabel?.trim() || "—";
  const clinic = (opts.clinicName ?? "").trim();

  const pat = opts.patient;
  const pName = pat.name?.trim() || "—";
  const pFn = pat.fileNumber?.trim() || "—";
  const pDob = pat.dateOfBirth?.trim() || "—";
  const pGen = pat.gender?.trim() || "—";
  const pPhone = pat.phone?.trim() || "—";

  const note = opts.note;
  const allergies = (note.allergies ?? "").trim();
  const diagnosis = (note.diagnosis ?? "").trim();
  const treatment = (note.treatment ?? "").trim();
  const createdAt = (note.createdAt ?? "").trim();

  const section = (label: string, value: string) => `
    <div class="sec">
      <div class="sec-h">${escapeHtml(label)}</div>
      <div class="sec-b">${value ? nl2brEscaped(value) : `<span class="muted">—</span>`}</div>
    </div>
  `;

  const metaClinic = clinic ? `<div class="meta-line"><span class="k">العيادة:</span> ${escapeHtml(clinic)}</div>` : "";
  const metaNoteTime = createdAt
    ? `<div class="meta-line"><span class="k">تاريخ الملاحظة:</span> ${escapeHtml(createdAt)}</div>`
    : "";

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8"/>
  <title>&#8203;</title>
  <style>
    * { box-sizing: border-box; }
    body{
      font-family: 'Segoe UI', Tahoma, 'Arial Unicode MS', Arial, sans-serif;
      color:#111827;
      line-height:1.55;
      margin:0;
      padding:22px 24px 30px;
      background:#fff;
    }
    .sheet{ max-width: 210mm; margin: 0 auto; }
    .head{
      border-bottom: 2px solid #1d4ed8;
      padding-bottom: 14px;
      margin-bottom: 14px;
    }
    .title{
      font-size: 1.25rem;
      font-weight: 800;
      margin: 0;
    }
    .sub{
      margin-top: 6px;
      color:#475569;
      font-size: 0.9rem;
    }
    .meta{
      margin-top: 10px;
      padding: 12px 12px;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      background: #f8fafc;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 12px;
      font-size: 0.88rem;
    }
    .meta-line{ min-width: 0; }
    .k{ color:#64748b; font-weight: 700; }
    .sec{
      margin-top: 12px;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .sec-h{
      padding: 10px 12px;
      background: #eff6ff;
      border-bottom: 1px solid #e5e7eb;
      color:#1e3a8a;
      font-weight: 800;
      font-size: 0.95rem;
    }
    .sec-b{
      padding: 12px 12px;
      font-size: 0.95rem;
      white-space: pre-wrap;
    }
    .muted{ color:#94a3b8; }
    .foot{
      margin-top: 16px;
      color:#64748b;
      font-size: 0.82rem;
      display:flex;
      justify-content: space-between;
      gap: 12px;
      border-top: 1px dashed #e5e7eb;
      padding-top: 10px;
    }
    @media print{
      body{ padding: 0; }
      .sheet{ max-width: none; padding: 18px 18px 24px; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <h1 class="title">${escapeHtml(title)}</h1>
      <div class="sub">الطبيب: ${escapeHtml(opts.doctorName?.trim() || "—")} — تاريخ الإصدار: ${escapeHtml(issuedAt)}</div>
      ${metaClinic ? `<div class="sub">${metaClinic.replace(/<[^>]+>/g, "")}</div>` : ""}
    </div>

    <div class="meta">
      <div class="meta-line"><span class="k">اسم المريض:</span> ${escapeHtml(pName)}</div>
      <div class="meta-line"><span class="k">رقم الملف:</span> ${escapeHtml(pFn)}</div>
      <div class="meta-line"><span class="k">تاريخ الميلاد:</span> ${escapeHtml(pDob)}</div>
      <div class="meta-line"><span class="k">الجنس:</span> ${escapeHtml(pGen)}</div>
      <div class="meta-line"><span class="k">الهاتف:</span> <span dir="ltr">${escapeHtml(pPhone)}</span></div>
      <div class="meta-line"><span class="k">المصدر:</span> Tabibi</div>
    </div>

    ${metaNoteTime ? `<div class="sub" style="margin-top:10px">${metaNoteTime.replace(/<[^>]+>/g, "")}</div>` : ""}

    ${section("الحساسيات / التنبيهات", allergies)}
    ${section("الحالة المرضية الأساسية", diagnosis)}
    ${section("العلاج / ما قام به الطبيب", treatment)}

    <div class="foot">
      <div>هذا التقرير مُولد من منصة Tabibi.</div>
      <div>يُستخدم لأغراض طبية داخلية.</div>
    </div>
  </div>
</body>
</html>`;
}

