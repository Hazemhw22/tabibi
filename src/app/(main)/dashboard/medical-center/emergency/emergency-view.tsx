"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { cn, formatDateMedium } from "@/lib/utils";
import IconBell from "@/components/icon/icon-bell";
import IconUsers from "@/components/icon/icon-users";
import IconSearch from "@/components/icon/icon-search";
import IconX from "@/components/icon/icon-x";
import IconPlus from "@/components/icon/icon-plus";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { CENTER_ROLES_ADMIN_RECEPTION } from "@/lib/medical-center-roles";
import { printHtmlDocument } from "@/lib/print-html";
import { buildEmergencyMedicalReportPrintHtml } from "@/lib/emergency-report-print-html";
import { normalizePhoneForSms } from "@/lib/sms";

type Visit = {
  id: string;
  patientName: string;
  patientPhone?: string | null;
  patientUserId?: string | null;
  complaint?: string | null;
  notes?: string | null;
  amount: number;
  paymentStatus: string;
  paymentMethod?: string | null;
  createdAt: string;
};

type Doc = { id: string; category: string; title: string; fileUrl: string; notes?: string; createdAt?: string };
type ReportRow = { id: string; title: string; body: string; medications?: string | null; createdAt?: string };

export default function EmergencyView() {
  const { data: session } = useSession();
  const canManagePayments = useMemo(
    () => CENTER_ROLES_ADMIN_RECEPTION.includes((session?.user?.role ?? "") as never),
    [session?.user?.role]
  );
  const [centerInfo, setCenterInfo] = useState<{ name: string | null; imageUrl: string | null }>({ name: null, imageUrl: null });
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => visits.find((v) => v.id === selectedId) ?? null, [visits, selectedId]);

  const [activeTab, setActiveTab] = useState<"info" | "transactions" | "labs" | "reports">("info");

  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    patientName: "",
    patientPhone: "",
    complaint: "",
    amount: "",
    notes: "",
  });

  const [docs, setDocs] = useState<Doc[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docForm, setDocForm] = useState({ category: "LAB", title: "", notes: "", file: null as File | null });

  const [reports, setReports] = useState<ReportRow[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportSaving, setReportSaving] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [reportBody, setReportBody] = useState("");
  const [reportMedications, setReportMedications] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/medical-center/emergency")
      .then((r) => r.json())
      .then((j) => setVisits((j.visits ?? []) as Visit[]))
      .catch(() => toast.error("تعذر تحميل الطوارئ"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    fetch("/api/medical-center/settings")
      .then((r) => r.json())
      .then((j) =>
        setCenterInfo({
          name: j?.center?.nameAr ?? j?.center?.name ?? null,
          imageUrl: j?.center?.imageUrl ?? null,
        })
      )
      .catch(() => setCenterInfo({ name: null, imageUrl: null }));
  }, []);

  useEffect(() => {
    setActiveTab("info");
    setDocs([]);
    setReports([]);
    const pid = selected?.patientUserId;
    if (!pid) return;
    setDocsLoading(true);
    fetch(`/api/medical-center/patient-documents?patientUserId=${encodeURIComponent(pid)}`)
      .then((r) => r.json())
      .then((j) => setDocs((j.documents ?? []) as Doc[]))
      .catch(() => {})
      .finally(() => setDocsLoading(false));
  }, [selectedId, selected?.patientUserId]);

  useEffect(() => {
    setReports([]);
    const vid = selected?.id;
    if (!vid) return;
    setReportsLoading(true);
    fetch(`/api/medical-center/emergency-reports?emergencyVisitId=${encodeURIComponent(vid)}`)
      .then((r) => r.json())
      .then((j) => setReports((j.reports ?? []) as ReportRow[]))
      .catch(() => {})
      .finally(() => setReportsLoading(false));
  }, [selectedId, selected?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visits;
    return visits.filter((v) => {
      const n = (v.patientName ?? "").toLowerCase();
      const p = (v.patientPhone ?? "") as string;
      return n.includes(q) || p.includes(q);
    });
  }, [visits, search]);

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.patientName.trim() || !form.patientPhone.trim() || Number.isNaN(amount) || amount < 0) {
      toast.error("الاسم + رقم الهاتف + المبلغ مطلوبون");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/medical-center/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: form.patientName.trim(),
          patientPhone: form.patientPhone.trim(),
          complaint: form.complaint.trim() || undefined,
          amount,
          notes: form.notes.trim() || undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j.error || "فشل الحفظ");
        return;
      }
      toast.success("تم تسجيل الحالة");
      setAddOpen(false);
      setForm({
        patientName: "",
        patientPhone: "",
        complaint: "",
        amount: "",
        notes: "",
      });
      load();
    } finally {
      setSaving(false);
    }
  };

  const toggleEmergencyPaid = async () => {
    if (!selected) return;
    if (!canManagePayments) {
      toast.error("صلاحية تغيير حالة الدفع للاستقبال/الحسابات فقط");
      return;
    }
    const prev = selected;
    const next = (selected.paymentStatus ?? "UNPAID").toUpperCase() === "PAID" ? "UNPAID" : "PAID";
    setVisits((p) => p.map((v) => (v.id === selected.id ? { ...v, paymentStatus: next } : v)));
    const res = await fetch(`/api/medical-center/emergency/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus: next }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(j.error || "فشل تحديث الدفع");
      setVisits((p) => p.map((v) => (v.id === prev.id ? prev : v)));
    }
  };

  const uploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected?.patientUserId) {
      toast.error("هذه الحالة غير مرتبطة بحساب مريض (أدخل رقم الهاتف عند الإضافة)");
      return;
    }
    if (!docForm.file || !docForm.title.trim()) {
      toast.error("الملف والعنوان مطلوبان");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", docForm.file);
      fd.append("patientUserId", selected.patientUserId);
      fd.append("category", docForm.category);
      fd.append("title", docForm.title.trim());
      if (docForm.notes.trim()) fd.append("notes", docForm.notes.trim());
      const res = await fetch("/api/medical-center/patient-documents", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j.error || "فشل الرفع");
        return;
      }
      toast.success("تم رفع الملف");
      setDocForm({ category: "LAB", title: "", notes: "", file: null });
      // reload docs
      const pid = selected.patientUserId;
      const rr = await fetch(`/api/medical-center/patient-documents?patientUserId=${encodeURIComponent(pid)}`);
      const jj = await rr.json().catch(() => ({}));
      setDocs((jj.documents ?? []) as Doc[]);
    } finally {
      setUploading(false);
    }
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected?.id) return;
    if (reportTitle.trim().length < 2 || reportBody.trim().length < 2) {
      toast.error("العنوان والمحتوى مطلوبان");
      return;
    }
    setReportSaving(true);
    try {
      const res = await fetch("/api/medical-center/emergency-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emergencyVisitId: selected.id,
          title: reportTitle.trim(),
          body: reportBody.trim(),
          medications: reportMedications.trim() || undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j.error || "فشل حفظ التقرير");
        return;
      }
      toast.success("تم حفظ التقرير");
      setReportTitle("");
      setReportBody("");
      setReportMedications("");
      // reload
      setReportsLoading(true);
      const rr = await fetch(`/api/medical-center/emergency-reports?emergencyVisitId=${encodeURIComponent(selected.id)}`);
      const jj = await rr.json().catch(() => ({}));
      setReports((jj.reports ?? []) as ReportRow[]);
      setReportsLoading(false);
    } finally {
      setReportSaving(false);
    }
  };

  const labDocs = docs.filter((d) => d.category === "LAB" || d.category === "IMAGING");
  // التقارير الطبية للطوارئ أصبحت نصية (EmergencyMedicalReport) وليس رفع ملفات.

  return (
    <div className="box-border flex h-[calc(100dvh-5.5rem-env(safe-area-inset-bottom,0px))] min-h-0 min-w-0 flex-col overflow-hidden py-3 sm:h-[calc(100dvh-6rem-env(safe-area-inset-bottom,0px))] sm:py-4 -mx-3 w-auto max-w-none sm:-mx-4 md:-mx-6">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:flex-row lg:rounded-2xl lg:h-full">
        {/* list */}
        <div className="order-1 flex w-full shrink-0 flex-col border-b border-gray-200 dark:border-slate-700 lg:order-none lg:h-full lg:w-72 lg:border-b-0 lg:border-l">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 dark:border-slate-700">
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <IconBell className="h-5 w-5 text-amber-600" />
                قسم الطوارئ
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500">{filtered.length} حالة</p>
            </div>
            <Button size="sm" className="h-8 gap-1.5" onClick={() => setAddOpen(true)}>
              <IconPlus className="h-4 w-4" /> إضافة
            </Button>
          </div>

          <div className="px-4 py-3">
            <div className="relative">
              <IconSearch className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالاسم أو الهاتف..."
                className="h-9 w-full rounded-lg border border-gray-200 bg-white py-2 pr-8 pl-8 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  <IconX className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            {loading ? <p className="px-4 py-6 text-sm text-gray-500">جاري التحميل...</p> : null}
            <ul className="space-y-2">
              {filtered.length === 0 ? (
                <li className="flex flex-col items-center justify-center px-4 py-10 text-center">
                  <IconUsers className="mb-2 h-10 w-10 text-gray-200 dark:text-slate-600" />
                  <p className="text-sm text-gray-400 dark:text-slate-500">{search ? "لا توجد نتائج" : "لا يوجد حالات"}</p>
                </li>
              ) : (
                filtered.map((v, i) => {
                  const active = selectedId === v.id;
                  return (
                    <li key={v.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(v.id)}
                        className={cn(
                          "relative flex w-full items-center gap-3 rounded-xl border border-gray-200/95 py-2.5 pe-3 ps-3 text-right shadow-sm transition-colors dark:border-slate-600",
                          active ? "border-gray-200/30 bg-blue-600" : "bg-white hover:bg-gray-50/90 dark:bg-slate-800/80 dark:hover:bg-slate-800"
                        )}
                      >
                        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold", active ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-300")}>
                          {(i + 1).toString()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn("truncate text-sm font-semibold", active ? "text-white" : "text-gray-900 dark:text-white")}>
                            {v.patientName}
                          </p>
                          <p className={cn("mt-0.5 truncate text-xs", active ? "text-blue-100" : "text-gray-500 dark:text-slate-400")}>
                            {v.patientPhone ? `هاتف: ${v.patientPhone} • ` : ""} {formatDateMedium(v.createdAt)}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>

        {/* details */}
        <div className="order-3 flex min-h-0 flex-1 flex-col overflow-hidden lg:order-none">
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                {selected ? `حالة: ${selected.patientName}` : "اختر حالة"}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                {selected ? `₪${Number(selected.amount ?? 0).toFixed(0)} • ${selected.paymentStatus}` : " "}
              </p>
            </div>
            <Link href="/dashboard/medical-center" className="text-sm text-blue-600 dark:text-blue-400">الرئيسية</Link>
          </div>

          {selected ? (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5">
                {activeTab === "info" && (
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="p-4 text-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div><span className="text-gray-500">الهاتف:</span> {selected.patientPhone ?? "—"}</div>
                          <div><span className="text-gray-500">التاريخ:</span> {formatDateMedium(selected.createdAt)}</div>
                          <div className="sm:col-span-2"><span className="text-gray-500">الشكوى:</span> {selected.complaint ?? "—"}</div>
                          <div className="sm:col-span-2"><span className="text-gray-500">ملاحظات:</span> {selected.notes ?? "—"}</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === "transactions" && (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-3">المعاملات</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div><span className="text-gray-500">المبلغ:</span> ₪{Number(selected.amount ?? 0).toFixed(0)}</div>
                        <div className="flex items-center justify-between gap-2">
                          <span><span className="text-gray-500">حالة الدفع:</span> {selected.paymentStatus}</span>
                          {canManagePayments ? (
                            <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => void toggleEmergencyPaid()}>
                              {String(selected.paymentStatus ?? "UNPAID").toUpperCase() === "PAID" ? "جعله غير مدفوع" : "وضعه مدفوع"}
                            </Button>
                          ) : null}
                        </div>
                        <div><span className="text-gray-500">طريقة الدفع:</span> {selected.paymentMethod ?? "—"}</div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activeTab === "labs" && (
                  <Card className="mb-4">
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-3">رفع ملف للمريض</h3>
                      <form onSubmit={uploadDoc} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label>النوع</Label>
                          <div className="mt-1">
                            <DropdownSelect
                              value={docForm.category}
                              onChange={(v) => setDocForm((f) => ({ ...f, category: v }))}
                              options={[
                                { value: "IMAGING", label: "أشعة" },
                                { value: "LAB", label: "تحاليل" },
                              ]}
                              placeholder="النوع"
                            />
                          </div>
                        </div>
                        <div>
                          <Label>عنوان الملف</Label>
                          <Input className="mt-1" value={docForm.title} onChange={(e) => setDocForm((f) => ({ ...f, title: e.target.value }))} />
                        </div>
                        <div className="sm:col-span-2">
                          <Label>ملاحظات</Label>
                          <Input className="mt-1" value={docForm.notes} onChange={(e) => setDocForm((f) => ({ ...f, notes: e.target.value }))} />
                        </div>
                        <div className="sm:col-span-2">
                          <Label>الملف</Label>
                          <Input className="mt-1" type="file" accept="application/pdf,image/*" onChange={(e) => setDocForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))} />
                        </div>
                        <div className="sm:col-span-2">
                          <Button type="submit" disabled={uploading}>{uploading ? "جاري الرفع..." : "رفع"}</Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {activeTab === "labs" && (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-3">الأشعة / التحاليل</h3>
                      {docsLoading ? <p className="text-sm text-gray-500">جاري التحميل...</p> : null}
                      <div className="space-y-2">
                        {labDocs.length === 0 && <p className="text-sm text-gray-500">لا يوجد ملفات.</p>}
                        {labDocs.map((d) => (
                          <div key={d.id} className="border rounded-lg p-3 text-sm flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium">{d.title}</p>
                              <p className="text-gray-500">{d.category} • {d.createdAt ? formatDateMedium(d.createdAt) : ""}</p>
                            </div>
                            <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">فتح</a>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activeTab === "reports" && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h3 className="font-semibold">التقارير الطبية</h3>
                      </div>
                      {reportsLoading ? <p className="text-sm text-gray-500">جاري التحميل...</p> : null}
                      <form onSubmit={submitReport} className="mb-4 space-y-2">
                        <Input
                          value={reportTitle}
                          onChange={(e) => setReportTitle(e.target.value)}
                          placeholder="عنوان التقرير"
                        />
                        <textarea
                          value={reportBody}
                          onChange={(e) => setReportBody(e.target.value)}
                          placeholder="اكتب التقرير الطبي هنا..."
                          className="h-28 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        <textarea
                          value={reportMedications}
                          onChange={(e) => setReportMedications(e.target.value)}
                          placeholder="العلاج / الدواء (اختياري)"
                          className="h-24 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        <div className="flex justify-end">
                          <Button type="submit" disabled={reportSaving}>
                            {reportSaving ? "جارٍ الحفظ..." : "حفظ التقرير"}
                          </Button>
                        </div>
                      </form>
                      <div className="space-y-2">
                        {reports.length === 0 && <p className="text-sm text-gray-500">لا يوجد تقارير.</p>}
                        {reports.map((r) => (
                          <div key={r.id} className="border rounded-lg p-3 text-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                              <p className="font-medium">{r.title}</p>
                              <p className="text-gray-500">{r.createdAt ? formatDateMedium(r.createdAt) : ""}</p>
                              <p className="text-gray-700 mt-2 whitespace-pre-line">{r.body}</p>
                                {r.medications ? (
                                  <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 p-2 text-xs text-emerald-900">
                                    <div className="font-semibold mb-1">العلاج / الدواء</div>
                                    <div className="whitespace-pre-line">{r.medications}</div>
                                  </div>
                                ) : null}
                              </div>
                              <div className="shrink-0 flex flex-col gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-8"
                                  onClick={() => {
                                    if (!selected) return;
                                    const normalized = normalizePhoneForSms(selected.patientPhone ?? null);
                                    const wa = normalized ? normalized.replace(/\D/g, "") : "";
                                    if (!wa) {
                                      toast.error("لا يوجد رقم هاتف للحالة لإرسال واتساب");
                                      return;
                                    }
                                    const cName = centerInfo.name ?? "المركز الطبي";
                                    const msg =
                                      `تقرير طبي — طوارئ\n` +
                                      `المركز: ${cName}\n` +
                                      `المريض: ${selected.patientName}\n` +
                                      `العنوان: ${r.title}\n` +
                                      `\n${r.body}\n` +
                                      (r.medications ? `\nالعلاج/الدواء:\n${r.medications}\n` : "");
                                    const href = `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
                                    window.open(href, "_blank", "noopener,noreferrer");
                                  }}
                                  disabled={!selected?.patientPhone}
                                  title={!selected?.patientPhone ? "أضف رقم الهاتف للحالة أولاً" : undefined}
                                >
                                  واتساب
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-8"
                                  onClick={() => {
                                    void (async () => {
                                      if (!selected) return;
                                      let cName = centerInfo.name;
                                      let cImg = centerInfo.imageUrl;
                                      if (!cName && !cImg) {
                                        const rr = await fetch("/api/medical-center/settings").catch(() => null);
                                        const jj = rr ? await rr.json().catch(() => ({})) : {};
                                        cName = jj?.center?.nameAr ?? jj?.center?.name ?? null;
                                        cImg = jj?.center?.imageUrl ?? null;
                                      }
                                      const html = buildEmergencyMedicalReportPrintHtml({
                                        origin: window.location.origin,
                                        centerName: cName,
                                        centerImageUrl: cImg,
                                        issuedAtLabel: new Date().toLocaleString("ar"),
                                        patientName: selected.patientName,
                                        patientPhone: selected.patientPhone ?? null,
                                        reportTitle: r.title,
                                        reportBody: r.body,
                                        reportMedications: r.medications ?? null,
                                        signerName: session?.user?.name ?? null,
                                      });
                                      printHtmlDocument(html, `تقرير طبي — ${selected.patientName}`);
                                    })();
                                  }}
                                >
                                  PDF
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center text-gray-300">
              <IconUsers className="mb-4 h-16 w-16" />
              <p className="text-sm text-gray-400">اختر حالة من القائمة</p>
              <p className="mt-1 text-xs text-gray-300">أو أضف حالة جديدة</p>
            </div>
          )}
        </div>

        {/* COLUMN 3 (LEFT) — tabs مثل مرضى الطبيب */}
        <div className="order-2 flex w-full shrink-0 flex-col border-b border-gray-200 bg-white lg:order-none lg:h-full lg:w-44 lg:border-b-0 lg:border-r dark:border-slate-700 dark:bg-slate-900">
          <div className="hidden shrink-0 border-b border-gray-100 px-4 py-3 lg:block dark:border-slate-700">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">القائمة</span>
          </div>
          <div className="flex gap-1 overflow-x-auto overscroll-x-contain px-1.5 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex lg:flex-col lg:gap-0 lg:overflow-visible lg:p-0 [&::-webkit-scrollbar]:hidden">
            {[
              { id: "info", label: "البيانات" },
              { id: "transactions", label: "المعاملات" },
              { id: "labs", label: "أشعة/تحاليل" },
              { id: "reports", label: "تقارير طبية" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={!selected}
                onClick={() => setActiveTab(t.id as typeof activeTab)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors lg:justify-start lg:rounded-none lg:px-4 lg:py-3",
                  !selected && "opacity-50",
                  activeTab === t.id
                    ? "bg-blue-600 text-white lg:border-r-4 lg:border-blue-300"
                    : "text-gray-600 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* add modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">إضافة حالة طوارئ</h2>
              <button type="button" onClick={() => setAddOpen(false)} className="text-gray-400 hover:text-gray-600">
                <IconX className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submitAdd} className="space-y-3">
              <div>
                <Label>اسم المريض</Label>
                <Input value={form.patientName} onChange={(e) => setForm((f) => ({ ...f, patientName: e.target.value }))} />
              </div>
              <div>
                <Label>رقم الهاتف</Label>
                <Input dir="ltr" value={form.patientPhone} onChange={(e) => setForm((f) => ({ ...f, patientPhone: e.target.value }))} placeholder="05xxxxxxxx" />
              </div>
              <div>
                <Label>الشكوى / المرض</Label>
                <Input value={form.complaint} onChange={(e) => setForm((f) => ({ ...f, complaint: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>التكلفة (₪)</Label>
                  <Input dir="ltr" type="number" min={0} step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
                </div>
                <div />
              </div>
              <div>
                <Label>ملاحظات</Label>
                <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={saving}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

