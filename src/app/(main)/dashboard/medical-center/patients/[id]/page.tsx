"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import LoadingScreen from "@/components/ui/loading-screen";
import { CENTER_ROLES_ADMIN_RECEPTION, CENTER_ROLES_ALL_STAFF } from "@/lib/medical-center-roles";
import { formatDateMedium } from "@/lib/utils";
import { printHtmlDocument } from "@/lib/print-html";
import { buildMedicalCenterReportsPrintHtml } from "@/lib/medical-center-report-print-html";
import { normalizePhoneForSms } from "@/lib/sms";

type P = { id: string; name?: string; email?: string; phone?: string };
type A = {
  id: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus?: string;
  fee?: number;
  doctor?: { user?: { name?: string }; specialty?: { nameAr?: string } };
};
type D = { id: string; category: string; title: string; fileUrl: string; notes?: string; createdAt?: string };

export default function CenterPatientDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const patientId = params?.id;

  const [centerInfo, setCenterInfo] = useState<{ name: string | null; imageUrl: string | null }>({ name: null, imageUrl: null });
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<P | null>(null);
  const [appointments, setAppointments] = useState<A[]>([]);
  const [documents, setDocuments] = useState<D[]>([]);
  const [activeTab, setActiveTab] = useState<"info" | "transactions" | "labs" | "reports">("info");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ category: "LAB", title: "", notes: "", file: null as File | null });

  const allowed = useMemo(
    () => CENTER_ROLES_ALL_STAFF.includes((session?.user?.role ?? "") as never),
    [session?.user?.role]
  );
  const canManagePayments = useMemo(
    () => CENTER_ROLES_ADMIN_RECEPTION.includes((session?.user?.role ?? "") as never),
    [session?.user?.role]
  );

  const load = () => {
    if (!patientId) return;
    fetch(`/api/medical-center/patients/${patientId}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) {
          toast.error(j.error);
          return;
        }
        setPatient(j.patient ?? null);
        setAppointments(j.appointments ?? []);
        setDocuments(j.documents ?? []);
      })
      .catch(() => toast.error("تعذر التحميل"))
      .finally(() => setLoading(false));
  };

  const toggleAppointmentPaid = async (apt: A) => {
    if (!apt?.id) return;
    if (!canManagePayments) {
      toast.error("صلاحية تغيير حالة الدفع للاستقبال/الحسابات فقط");
      return;
    }
    const next = (apt.paymentStatus ?? "UNPAID").toUpperCase() === "PAID" ? "UNPAID" : "PAID";
    setAppointments((prev) => prev.map((a) => (a.id === apt.id ? { ...a, paymentStatus: next } : a)));
    const res = await fetch(`/api/medical-center/appointments/${apt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus: next }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(j.error || "فشل تحديث الدفع");
      setAppointments((prev) => prev.map((a) => (a.id === apt.id ? apt : a)));
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    if (!allowed) {
      router.replace("/dashboard/medical-center");
      return;
    }
    fetch("/api/medical-center/settings")
      .then((r) => r.json())
      .then((j) =>
        setCenterInfo({
          name: j?.center?.nameAr ?? j?.center?.name ?? null,
          imageUrl: j?.center?.imageUrl ?? null,
        })
      )
      .catch(() => setCenterInfo({ name: null, imageUrl: null }));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, allowed, patientId]);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !form.file || !form.title.trim()) {
      toast.error("الملف والعنوان مطلوبان");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("file", form.file);
      fd.append("patientUserId", patientId);
      fd.append("category", form.category);
      fd.append("title", form.title.trim());
      if (form.notes.trim()) fd.append("notes", form.notes.trim());
      const res = await fetch("/api/medical-center/patient-documents", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) {
        toast.error(j.error || "فشل الرفع");
        return;
      }
      toast.success("تم رفع الملف");
      setForm({ category: "LAB", title: "", notes: "", file: null });
      load();
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading" || !allowed) return <LoadingScreen label="جاري التحميل..." />;
  if (loading) return <LoadingScreen label="جاري تحميل ملف المريض..." />;

  const labDocs = documents.filter((d) => d.category === "LAB" || d.category === "IMAGING");
  const reportDocs = documents.filter((d) => d.category === "MEDICAL_REPORT");
  const totalFees = appointments.reduce((s, a) => s + Number(a.fee ?? 0), 0);
  const paidFees = appointments
    .filter((a) => (a.paymentStatus ?? "").toUpperCase() === "PAID")
    .reduce((s, a) => s + Number(a.fee ?? 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 mx-auto max-w-5xl">
      <Link href="/dashboard/medical-center/patients" className="text-sm text-blue-600 mb-4 inline-block">
        ← العودة لمرضى المركز
      </Link>
      <h1 className="text-xl font-bold mb-5">ملف المريض: {patient?.name ?? "—"}</h1>

      <Card className="mb-6">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
          <div><span className="text-gray-500">الهاتف:</span> {patient?.phone ?? "—"}</div>
          <div><span className="text-gray-500">البريد:</span> {patient?.email ?? "—"}</div>
          <div><span className="text-gray-500">حجوزات:</span> {appointments.length}</div>
          <div><span className="text-gray-500">الإجمالي:</span> ₪{Number(totalFees).toFixed(0)} (مدفوع ₪{Number(paidFees).toFixed(0)})</div>
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button type="button" variant={activeTab === "info" ? "default" : "outline"} onClick={() => setActiveTab("info")}>البيانات</Button>
        <Button type="button" variant={activeTab === "transactions" ? "default" : "outline"} onClick={() => setActiveTab("transactions")}>المعاملات</Button>
        <Button type="button" variant={activeTab === "labs" ? "default" : "outline"} onClick={() => setActiveTab("labs")}>الأشعة / التحاليل</Button>
        <Button type="button" variant={activeTab === "reports" ? "default" : "outline"} onClick={() => setActiveTab("reports")}>التقارير الطبية</Button>
      </div>

      {activeTab === "info" && (
        <Card className="mb-6">
          <CardContent className="p-4 text-sm text-gray-700">
            <p>يمكنك من التبويبات رفع ملفات أشعة/تحاليل أو تقارير طبية للمريض.</p>
          </CardContent>
        </Card>
      )}

      {activeTab === "transactions" && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <h2 className="font-semibold mb-3">المعاملات (حجوزات المركز)</h2>
            {appointments.length === 0 ? (
              <p className="text-sm text-gray-500">لا يوجد حجوزات لهذا المريض.</p>
            ) : (
              <div className="space-y-2">
                {appointments.map((a) => (
                  <div key={a.id} className="border rounded-lg p-3 text-sm flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-medium">
                        {a.doctor?.user?.name ? `د. ${a.doctor.user.name}` : "طبيب"} {a.doctor?.specialty?.nameAr ? `• ${a.doctor.specialty.nameAr}` : ""}
                      </div>
                      <div className="text-gray-500">
                        {a.appointmentDate} • {a.startTime}-{a.endTime} • {a.status}
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-bold">₪{Number(a.fee ?? 0).toFixed(0)}</div>
                      <div className="text-xs text-gray-500 flex items-center justify-end gap-2">
                        <span>{(a.paymentStatus ?? "UNPAID").toString()}</span>
                        {canManagePayments ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() => void toggleAppointmentPaid(a)}
                          >
                            {String((a.paymentStatus ?? "UNPAID")).toUpperCase() === "PAID" ? "جعله غير مدفوع" : "وضعه مدفوع"}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(activeTab === "labs" || activeTab === "reports") && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <h2 className="font-semibold mb-3">رفع ملف للمريض</h2>
            <form onSubmit={upload} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>النوع</Label>
                <div className="mt-1">
                  <DropdownSelect
                    value={form.category}
                    onChange={(v) => setForm((f) => ({ ...f, category: v }))}
                    options={[
                      { value: "MEDICAL_REPORT", label: "تقرير طبي" },
                      { value: "IMAGING", label: "أشعة" },
                      { value: "LAB", label: "تحاليل" },
                    ]}
                    placeholder="النوع"
                  />
                </div>
              </div>
              <div>
                <Label>عنوان الملف</Label>
                <Input className="mt-1" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <Label>ملاحظات</Label>
                <Input className="mt-1" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <Label>الملف</Label>
                <Input className="mt-1" type="file" accept="application/pdf,image/*" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={submitting}>{submitting ? "جاري الرفع..." : "رفع"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === "labs" && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <h2 className="font-semibold mb-3">الأشعة / التحاليل</h2>
            <div className="space-y-2">
              {labDocs.length === 0 && <p className="text-sm text-gray-500">لا يوجد ملفات حتى الآن.</p>}
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
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-semibold">التقارير الطبية (يضيفها المركز)</h2>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => {
                    const normalized = normalizePhoneForSms(patient?.phone ?? null);
                    const wa = normalized ? normalized.replace(/\D/g, "") : "";
                    if (!wa) {
                      toast.error("لا يوجد رقم هاتف للمريض لإرسال واتساب");
                      return;
                    }
                    const cName = centerInfo.name ?? "المركز الطبي";
                    const lines = reportDocs.map((d, idx) => `${idx + 1}) ${d.title} — ${d.fileUrl}`);
                    const msg =
                      `تقرير طبي — ${cName}\n` +
                      `المريض: ${patient?.name ?? "—"}\n` +
                      (lines.length ? `\nالملفات:\n${lines.join("\n")}\n` : "\nلا يوجد تقارير مرفوعة.\n");
                    const href = `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
                    window.open(href, "_blank", "noopener,noreferrer");
                  }}
                  disabled={reportDocs.length === 0 || !patient?.phone}
                  title={!patient?.phone ? "أضف رقم هاتف للمريض أولاً" : undefined}
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
                      let cName = centerInfo.name;
                      let cImg = centerInfo.imageUrl;
                      if (!cName && !cImg) {
                        const r = await fetch("/api/medical-center/settings").catch(() => null);
                        const j = r ? await r.json().catch(() => ({})) : {};
                        cName = j?.center?.nameAr ?? j?.center?.name ?? null;
                        cImg = j?.center?.imageUrl ?? null;
                      }
                      const html = buildMedicalCenterReportsPrintHtml({
                        origin: window.location.origin,
                        centerName: cName,
                        centerImageUrl: cImg,
                        issuedAtLabel: new Date().toLocaleString("ar"),
                        patientName: patient?.name ?? "—",
                        patientPhone: patient?.phone ?? null,
                        patientEmail: patient?.email ?? null,
                        reports: reportDocs.map((d) => ({
                          title: d.title,
                          createdAt: d.createdAt ?? null,
                          notes: d.notes ?? null,
                          fileUrl: d.fileUrl,
                        })),
                        heading: "تقارير طبية — المركز",
                      });
                      printHtmlDocument(html, `تقارير طبية — ${patient?.name ?? "patient"}`);
                    })();
                  }}
                  disabled={reportDocs.length === 0}
                >
                  PDF
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {reportDocs.length === 0 && <p className="text-sm text-gray-500">لا يوجد تقارير حتى الآن.</p>}
              {reportDocs.map((d) => (
                <div key={d.id} className="border rounded-lg p-3 text-sm flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{d.title}</p>
                    <p className="text-gray-500">{d.createdAt ? formatDateMedium(d.createdAt) : ""}</p>
                    {d.notes ? <p className="text-gray-600 mt-1">{d.notes}</p> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => {
                        const normalized = normalizePhoneForSms(patient?.phone ?? null);
                        const wa = normalized ? normalized.replace(/\D/g, "") : "";
                        if (!wa) {
                          toast.error("لا يوجد رقم هاتف للمريض لإرسال واتساب");
                          return;
                        }
                        const cName = centerInfo.name ?? "المركز الطبي";
                        const msg =
                          `تقرير طبي — ${cName}\n` +
                          `المريض: ${patient?.name ?? "—"}\n` +
                          `العنوان: ${d.title}\n` +
                          (d.notes ? `ملاحظات: ${d.notes}\n` : "") +
                          `الرابط: ${d.fileUrl}\n`;
                        const href = `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
                        window.open(href, "_blank", "noopener,noreferrer");
                      }}
                      disabled={!patient?.phone}
                      title={!patient?.phone ? "أضف رقم هاتف للمريض أولاً" : undefined}
                    >
                      واتساب
                    </Button>
                    <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">فتح</a>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
