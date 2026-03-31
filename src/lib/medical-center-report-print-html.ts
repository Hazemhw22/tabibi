import { escapeHtml } from "@/lib/care-plan-print-html";

export type MedicalCenterUploadedReport = {
  title: string;
  createdAt?: string | null;
  notes?: string | null;
  fileUrl: string;
};

export function buildMedicalCenterReportsPrintHtml(opts: {
  origin?: string;
  centerName?: string | null;
  centerImageUrl?: string | null;
  issuedAtLabel: string;
  patientName: string;
  patientPhone?: string | null;
  patientEmail?: string | null;
  reports: MedicalCenterUploadedReport[];
  heading?: string;
}): string {
  const origin = (opts.origin ?? "").trim();
  const centerName = (opts.centerName ?? "").trim();
  const centerImage = (opts.centerImageUrl ?? "").trim();
  const issuedAt = opts.issuedAtLabel?.trim() || "—";
  const pName = opts.patientName?.trim() || "—";
  const pPhone = (opts.patientPhone ?? "").trim() || "—";
  const pEmail = (opts.patientEmail ?? "").trim() || "—";
  const heading = (opts.heading ?? "تقارير طبية — المركز").trim() || "تقارير طبية — المركز";

  const resolvedCenterImageUrl =
    centerImage
      ? (centerImage.startsWith("http") || centerImage.startsWith("data:") || !origin
          ? centerImage
          : `${origin.replace(/\/$/, "")}${centerImage.startsWith("/") ? "" : "/"}${centerImage}`)
      : "";

  const rows =
    opts.reports.length > 0
      ? opts.reports
          .map(
            (r, i) => `
  <tr>
    <td class="idx">${i + 1}</td>
    <td>${escapeHtml(r.title || "—")}</td>
    <td>${escapeHtml((r.createdAt ?? "") || "—")}</td>
    <td>${escapeHtml((r.notes ?? "") || "—")}</td>
    <td dir="ltr"><a href="${escapeHtml(r.fileUrl)}">${escapeHtml(r.fileUrl)}</a></td>
  </tr>`,
          )
          .join("")
      : `<tr><td colspan="5" class="muted">— لا يوجد تقارير —</td></tr>`;

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
    .title{ font-size:1.25rem; font-weight:800; margin:0; }
    .sub{ margin-top:6px; color:#475569; font-size:0.9rem; }
    .logo{ width:56px; height:56px; border-radius:14px; border:1px solid #e5e7eb; background:#fff; overflow:hidden; display:flex; align-items:center; justify-content:center; }
    .logo img{ width:100%; height:100%; object-fit:cover; display:block; }
    .meta{ margin-top:10px; padding:12px; border:1px solid #e5e7eb; border-radius:12px; background:#f8fafc; display:grid; grid-template-columns:1fr 1fr; gap:8px 12px; font-size:0.88rem; }
    .k{ color:#64748b; font-weight:700; }
    table{ width:100%; border-collapse:collapse; margin-top:14px; }
    th,td{ border:1px solid #e5e7eb; padding:8px 10px; vertical-align:top; font-size:0.9rem; }
    th{ background:#f8fafc; color:#334155; text-align:right; }
    .idx{ width:40px; text-align:center; font-weight:700; }
    .muted{ color:#94a3b8; text-align:center; padding:18px 10px; }
    a{ color:#1d4ed8; text-decoration:underline; word-break:break-all; }
    @media print{ body{ padding:0; } .sheet{ max-width:none; padding:18px 18px 24px; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <div class="head-row">
        <div class="head-left">
          <h1 class="title">${escapeHtml(heading)}</h1>
          ${centerName ? `<div class="sub">${escapeHtml(centerName)}</div>` : ""}
          <div class="sub">تاريخ الإصدار: ${escapeHtml(issuedAt)}</div>
        </div>
        ${resolvedCenterImageUrl ? `<div class="logo"><img src="${escapeHtml(resolvedCenterImageUrl)}" alt=""/></div>` : ""}
      </div>
    </div>
    <div class="meta">
      <div><span class="k">اسم المريض:</span> ${escapeHtml(pName)}</div>
      <div><span class="k">الهاتف:</span> <span dir="ltr">${escapeHtml(pPhone)}</span></div>
      <div><span class="k">البريد:</span> <span dir="ltr">${escapeHtml(pEmail)}</span></div>
      <div><span class="k">المصدر:</span> Tabibi</div>
    </div>
    <table>
      <thead>
        <tr>
          <th class="idx">#</th>
          <th>العنوان</th>
          <th>التاريخ</th>
          <th>ملاحظات</th>
          <th>الرابط</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

