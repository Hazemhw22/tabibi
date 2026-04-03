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
  const title = (opts.reportTitle ?? "تقرير طبي رسمي").trim() || "تقرير طبي رسمي";
  const issuedAt = opts.issuedAtLabel?.trim() || "—";
  const clinic = (opts.clinicName ?? "").trim();

  const pat = opts.patient;
  const pName = pat.name?.trim() || "—";
  const pFn = pat.fileNumber?.trim() || "—";
  const pDob = pat.dateOfBirth?.trim() || "—";
  const pGen = pat.gender?.trim() || "—";
  const pPhone = pat.phone?.trim() || "—";

  const note = opts.note;
  const rawDiagnosis = (note.diagnosis ?? "").trim();
  const isStructured = rawDiagnosis.startsWith("STRUCTURED_REPORT_V1:");

  let structuredData: any = null;
  if (isStructured) {
    try {
      structuredData = JSON.parse(rawDiagnosis.replace("STRUCTURED_REPORT_V1:", ""));
    } catch (e) {
      console.error("Failed to parse structured report JSON", e);
    }
  }

  const section = (label: string, value: string, iconHtml?: string) => {
    if (!value?.trim()) return "";
    return `
      <div class="sec">
        <div class="sec-h">
          ${iconHtml ? `<span class="sec-icon">${iconHtml}</span>` : ""}
          ${escapeHtml(label)}
        </div>
        <div class="sec-b">${nl2brEscaped(value)}</div>
      </div>
    `;
  };

  const vitalsSection = (data: any) => {
    const parts = [];
    if (data.bp) parts.push(`<div class="v-item"><span class="v-lbl">الضغط:</span> <span class="v-val">${escapeHtml(data.bp)}</span></div>`);
    if (data.temp) parts.push(`<div class="v-item"><span class="v-lbl">الحرارة:</span> <span class="v-val">${escapeHtml(data.temp)}°C</span></div>`);
    if (data.pulse) parts.push(`<div class="v-item"><span class="v-lbl">النبض:</span> <span class="v-val">${escapeHtml(data.pulse)} bpm</span></div>`);
    
    if (parts.length === 0 && !data.physicalExamination) return "";
    
    return `
      <div class="sec">
        <div class="sec-h">العلامات الحيوية والفحص السريري</div>
        <div class="sec-b">
          ${parts.length > 0 ? `<div class="v-grid">${parts.join("")}</div>` : ""}
          ${data.physicalExamination ? `<div class="p-exam">${nl2brEscaped(data.physicalExamination)}</div>` : ""}
        </div>
      </div>
    `;
  };

  const reportBody = isStructured && structuredData ? `
    ${section("الحساسيات / التنبيهات", note.allergies || "")}
    ${section("الشكوى الرئيسية", structuredData.presentingComplaints)}
    ${vitalsSection(structuredData)}
    ${section("الفحوصات الطبية", structuredData.investigations)}
    <div class="sec">
      <div class="sec-h">التشخيص الطبي</div>
      <div class="sec-b">
        <div class="diag-val">${nl2brEscaped(structuredData.diagnosis || "")}</div>
        ${structuredData.icd10 ? `<div class="icd">ICD-10 Code: ${escapeHtml(structuredData.icd10)}</div>` : ""}
      </div>
    </div>
    ${section("العلاج والتوصيات", structuredData.recommendations)}
    ${structuredData.sickLeaveDays ? `
      <div class="sec sick-sec">
        <div class="sec-h">تقرير الإجازة المرضية</div>
        <div class="sec-b">
          يُنصح المريض بإجازة مرضية لمدة <b>${escapeHtml(structuredData.sickLeaveDays)}</b> أيام.
          ${structuredData.sickLeaveNotes ? `<div class="mt-2">${nl2brEscaped(structuredData.sickLeaveNotes)}</div>` : ""}
        </div>
      </div>
    ` : ""}
  ` : `
    ${section("الحساسيات / التنبيهات", note.allergies || "")}
    ${section("التشخيص / الحالة المرضية", note.diagnosis || "")}
    ${section("العلاج / ما قام به الطبيب", note.treatment || "")}
  `;

  const metaClinic = clinic ? `<div class="meta-line"><span class="k">العيادة:</span> ${escapeHtml(clinic)}</div>` : "";
  const createdAt = (note.createdAt ?? "").trim();
  const metaNoteTimeLabel = createdAt ? `تاريخ الكشف: ${escapeHtml(createdAt)}` : "";

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
      line-height:1.5;
      margin:0;
      padding:22px 24px 30px;
      background:#fff;
    }
    .sheet{ max-width: 210mm; margin: 0 auto; }
    .head{
      border-bottom: 2px solid #1d4ed8;
      padding-bottom: 14px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .title{ font-size: 1.5rem; font-weight: 800; margin: 0; color: #1e3a8a; }
    .sub{ color:#475569; font-size: 0.85rem; margin-top: 4px; }
    .meta{
      margin-top: 10px;
      padding: 12px 14px;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      background: #f8fafc;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 12px;
      font-size: 0.85rem;
    }
    .k{ color:#64748b; font-weight: 700; margin-left: 4px; }
    .sec{ margin-top: 12px; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; page-break-inside: avoid; }
    .sec-h{ padding: 8px 12px; background: #f1f5f9; border-bottom: 1px solid #e5e7eb; color:#334155; font-weight: 800; font-size: 0.85rem; }
    .sec-b{ padding: 10px 12px; font-size: 0.9rem; }
    .v-grid{ display: flex; gap: 20px; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px dashed #e2e8f0; }
    .v-item{ font-size: 0.85rem; }
    .v-lbl{ color: #64748b; font-weight: 600; }
    .v-val{ font-weight: 700; color: #1e3a8a; }
    .icd{ margin-top: 6px; font-size: 0.75rem; font-family: monospace; color: #64748b; background: #f8fafc; padding: 2px 6px; border-radius: 4px; display: inline-block; }
    .sick-sec{ border-color: #fecdd3; }
    .sick-sec .sec-h{ background: #fff1f2; color: #9f1239; }
    .foot{ margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 0.75rem; color: #94a3b8; }
    .mt-2{ margin-top: 8px; }
    @media print{ body{ padding: 0; } .sheet{ max-width: none; padding: 10mm 12mm; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <div>
        <h1 class="title">${escapeHtml(title)}</h1>
        <div class="sub">${metaNoteTimeLabel}</div>
      </div>
      <div style="text-align: left;">
        <div class="sub" style="font-weight: 700;">د. ${escapeHtml(opts.doctorName)}</div>
        ${clinic ? `<div class="sub">${escapeHtml(clinic)}</div>` : ""}
      </div>
    </div>

    <div class="meta">
      <div><span class="k">المريض:</span> ${escapeHtml(pName)}</div>
      <div><span class="k">رقم الملف:</span> ${escapeHtml(pFn)}</div>
      <div><span class="k">تاريخ الميلاد:</span> ${escapeHtml(pDob)}</div>
      <div><span class="k">الجنس:</span> ${escapeHtml(pGen)}</div>
      <div style="grid-column: span 2;"><span class="k">تاريخ الطباعة:</span> ${escapeHtml(issuedAt)}</div>
    </div>

    ${reportBody}

    <div class="foot">
      <div>صُدر عبر منصة تابيبي (Tabibi) — التقرير معتمد بتوقيع الطبيب المرفق.</div>
      <div style="text-align: center; flex: 1;">توقيع الطبيب: ................................</div>
    </div>
  </div>
</body>
</html>`;
}

