import { escapeHtml, nl2brEscaped } from "@/lib/care-plan-print-html";

export function buildEmergencyMedicalReportPrintHtml(opts: {
  origin?: string;
  issuedAtLabel: string;
  centerName?: string | null;
  centerImageUrl?: string | null;
  patientName: string;
  patientPhone?: string | null;
  reportTitle: string;
  reportBody: string;
  reportMedications?: string | null;
  signerName?: string | null;
}): string {
  const origin = (opts.origin ?? "").trim();
  const issuedAt = opts.issuedAtLabel?.trim() || "—";
  const center = (opts.centerName ?? "").trim();
  const centerImage = (opts.centerImageUrl ?? "").trim();
  const pName = opts.patientName?.trim() || "—";
  const pPhone = (opts.patientPhone ?? "").trim() || "—";
  const reportTitle = opts.reportTitle?.trim() || "—";
  const body = opts.reportBody?.trim() || "";
  const meds = (opts.reportMedications ?? "").trim();
  const signer = (opts.signerName ?? "").trim();

  const resolvedCenterImageUrl =
    centerImage
      ? (centerImage.startsWith("http") || centerImage.startsWith("data:") || !origin
          ? centerImage
          : `${origin.replace(/\/$/, "")}${centerImage.startsWith("/") ? "" : "/"}${centerImage}`)
      : "";

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8"/>
  <title>&#8203;</title>
  <style>
    *{ box-sizing:border-box; }
    body{ font-family:'Segoe UI',Tahoma,'Arial Unicode MS',Arial,sans-serif; color:#111827; margin:0; padding:22px 24px 30px; background:#fff; line-height:1.55; }
    .sheet{ max-width:210mm; margin:0 auto; }
    .head{ border-bottom:2px solid #1d4ed8; padding-bottom:14px; margin-bottom:14px; }
    .head-row{ display:flex; align-items:center; justify-content:space-between; gap:12px; }
    .head-left{ min-width:0; flex:1; }
    .title{ font-size:1.35rem; font-weight:900; margin:0; }
    .sub{ margin-top:6px; color:#475569; font-size:0.9rem; }
    .logo{ width:56px; height:56px; border-radius:14px; border:1px solid #e5e7eb; background:#fff; overflow:hidden; display:flex; align-items:center; justify-content:center; }
    .logo img{ width:100%; height:100%; object-fit:cover; display:block; }
    .meta{ margin-top:10px; padding:12px; border:1px solid #e5e7eb; border-radius:12px; background:#f8fafc; display:grid; grid-template-columns:1fr 1fr; gap:8px 12px; font-size:0.88rem; }
    .k{ color:#64748b; font-weight:700; }
    .sec{ margin-top:12px; border:1px solid #e5e7eb; border-radius:14px; overflow:hidden; page-break-inside:avoid; }
    .sec-h{ padding:10px 12px; background:#eff6ff; border-bottom:1px solid #e5e7eb; color:#1e3a8a; font-weight:800; font-size:0.95rem; }
    .sec-b{ padding:12px; font-size:0.95rem; white-space:pre-wrap; }
    .muted{ color:#94a3b8; }
    .sign{ margin-top:16px; border-top:1px dashed #e5e7eb; padding-top:12px; display:flex; justify-content:space-between; gap:12px; align-items:flex-end; }
    .sign-box{ width:48%; min-width:0; }
    .sign-label{ color:#64748b; font-weight:800; font-size:0.85rem; margin-bottom:6px; }
    .sign-line{ border-bottom:1px solid #111827; height:28px; }
    .sign-name{ margin-top:6px; font-size:0.9rem; color:#111827; }
    @media print{ body{ padding:0; } .sheet{ max-width:none; padding:18px 18px 24px; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <div class="head-row">
        <div class="head-left">
          <h1 class="title">تقرير طبي</h1>
          ${center ? `<div class="sub">${escapeHtml(center)}</div>` : ""}
          <div class="sub">تاريخ الإصدار: ${escapeHtml(issuedAt)}</div>
        </div>
        ${resolvedCenterImageUrl ? `<div class="logo"><img src="${escapeHtml(resolvedCenterImageUrl)}" alt=""/></div>` : ""}
      </div>
    </div>
    <div class="meta">
      <div><span class="k">اسم المريض:</span> ${escapeHtml(pName)}</div>
      <div><span class="k">الهاتف:</span> <span dir="ltr">${escapeHtml(pPhone)}</span></div>
      <div><span class="k">النوع:</span> طوارئ</div>
      <div><span class="k">المصدر:</span> Tabibi</div>
    </div>
    <div class="sec">
      <div class="sec-h">عنوان التقرير</div>
      <div class="sec-b">${reportTitle ? nl2brEscaped(reportTitle) : `<span class="muted">—</span>`}</div>
    </div>
    <div class="sec">
      <div class="sec-h">نص التقرير</div>
      <div class="sec-b">${body ? nl2brEscaped(body) : `<span class="muted">—</span>`}</div>
    </div>
    <div class="sec">
      <div class="sec-h">العلاج / الدواء</div>
      <div class="sec-b">${meds ? nl2brEscaped(meds) : `<span class="muted">—</span>`}</div>
    </div>
    <div class="sign">
      <div class="sign-box">
        <div class="sign-label">التوقيع</div>
        <div class="sign-line"></div>
        <div class="sign-name">${signer ? escapeHtml(signer) : `<span class="muted">—</span>`}</div>
      </div>
      <div class="sign-box">
        <div class="sign-label">الختم</div>
        <div class="sign-line"></div>
        <div class="sign-name"><span class="muted">—</span></div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

