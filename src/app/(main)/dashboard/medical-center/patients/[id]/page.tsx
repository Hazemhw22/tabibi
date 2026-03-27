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
import { CENTER_ROLES_ALL_STAFF } from "@/lib/medical-center-roles";
import { formatDateMedium } from "@/lib/utils";

type P = { id: string; name?: string; email?: string; phone?: string };
type A = {
  id: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: string;
  fee?: number;
  doctor?: { user?: { name?: string }; specialty?: { nameAr?: string } };
};
type D = { id: string; category: string; title: string; fileUrl: string; notes?: string; createdAt?: string };

export default function CenterPatientDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const patientId = params?.id;

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<P | null>(null);
  const [appointments, setAppointments] = useState<A[]>([]);
  const [documents, setDocuments] = useState<D[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ category: "LAB", title: "", notes: "", file: null as File | null });

  const allowed = useMemo(
    () => CENTER_ROLES_ALL_STAFF.includes((session?.user?.role ?? "") as never),
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

  useEffect(() => {
    if (status === "loading") return;
    if (!allowed) {
      router.replace("/dashboard/medical-center");
      return;
    }
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 mx-auto max-w-5xl">
      <Link href="/dashboard/medical-center/patients" className="text-sm text-blue-600 mb-4 inline-block">
        ← العودة لمرضى المركز
      </Link>
      <h1 className="text-xl font-bold mb-5">ملف المريض: {patient?.name ?? "—"}</h1>

      <Card className="mb-6">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div><span className="text-gray-500">الهاتف:</span> {patient?.phone ?? "—"}</div>
          <div><span className="text-gray-500">البريد:</span> {patient?.email ?? "—"}</div>
          <div><span className="text-gray-500">عدد حجوزات المركز:</span> {appointments.length}</div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="font-semibold mb-3">رفع تقرير طبي / نتيجة أشعة أو تحليل</h2>
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
              <Button type="submit" disabled={submitting}>{submitting ? "جاري الرفع..." : "رفع إلى ملف المريض"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="font-semibold mb-3">سجل ملفات المركز الطبية</h2>
          <div className="space-y-2">
            {documents.length === 0 && <p className="text-sm text-gray-500">لا يوجد ملفات حتى الآن.</p>}
            {documents.map((d) => (
              <div key={d.id} className="border rounded-lg p-3 text-sm flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{d.title}</p>
                  <p className="text-gray-500">{d.category} • {d.createdAt ? formatDateMedium(d.createdAt) : ""}</p>
                </div>
                <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  فتح
                </a>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
