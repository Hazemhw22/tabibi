"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import LoadingScreen from "@/components/ui/loading-screen";
import { CENTER_ROLE_ADMIN } from "@/lib/medical-center-roles";

type Staff = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  salaryMonthly?: number | null;
  educationLevel?: string | null;
  staffType?: string | null;
  attendanceNotes?: string | null;
};

export default function StaffDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const staffId = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    salaryMonthly: "",
    educationLevel: "",
    staffType: "",
    attendanceNotes: "",
  });

  const load = () => {
    if (!staffId) return;
    fetch(`/api/medical-center/staff/${staffId}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) {
          toast.error(j.error);
          return;
        }
        const s = j.staff as Staff;
        setStaff(s);
        setForm({
          name: s.name ?? "",
          phone: s.phone ?? "",
          salaryMonthly: s.salaryMonthly != null ? String(s.salaryMonthly) : "",
          educationLevel: s.educationLevel ?? "",
          staffType: s.staffType ?? "",
          attendanceNotes: s.attendanceNotes ?? "",
        });
      })
      .catch(() => toast.error("تعذر التحميل"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (status === "loading") return;
    if (session?.user?.role !== CENTER_ROLE_ADMIN) {
      router.replace("/dashboard/medical-center");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.role, staffId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        salaryMonthly: form.salaryMonthly.trim() ? Number(form.salaryMonthly) : null,
        educationLevel: form.educationLevel.trim() || null,
        staffType: form.staffType.trim() || null,
        attendanceNotes: form.attendanceNotes.trim() || null,
      };
      const res = await fetch(`/api/medical-center/staff/${staffId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) {
        toast.error(j.error || "فشل الحفظ");
        return;
      }
      toast.success(j.message || "تم الحفظ");
      load();
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || session?.user?.role !== CENTER_ROLE_ADMIN) return <LoadingScreen label="جاري التحميل..." />;
  if (loading) return <LoadingScreen label="جاري تحميل بيانات الموظف..." />;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <Link href="/dashboard/medical-center/staff" className="text-sm text-blue-600 mb-4 inline-block">
        ← العودة للموظفين
      </Link>
      <h1 className="text-xl font-bold mb-5">تفاصيل الموظف</h1>

      <Card>
        <CardContent className="p-5">
          <form onSubmit={save} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>الاسم</Label>
                <Input className="mt-1" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label>البريد (للعرض)</Label>
                <Input className="mt-1" value={staff?.email ?? ""} disabled />
              </div>
              <div>
                <Label>الهاتف</Label>
                <Input className="mt-1" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <Label>نوع الموظف</Label>
                <Input className="mt-1" value={form.staffType} onChange={(e) => setForm((f) => ({ ...f, staffType: e.target.value }))} placeholder="مثال: محاسب / نظافة / استقبال" />
              </div>
              <div>
                <Label>المستوى التعليمي</Label>
                <Input className="mt-1" value={form.educationLevel} onChange={(e) => setForm((f) => ({ ...f, educationLevel: e.target.value }))} placeholder="مثال: بكالوريوس" />
              </div>
              <div>
                <Label>الراتب الشهري (₪)</Label>
                <Input className="mt-1" type="number" min={0} step="0.01" value={form.salaryMonthly} onChange={(e) => setForm((f) => ({ ...f, salaryMonthly: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>قسم الدوام (ملاحظات)</Label>
              <Input className="mt-1" value={form.attendanceNotes} onChange={(e) => setForm((f) => ({ ...f, attendanceNotes: e.target.value }))} placeholder="أيام الدوام، الساعات، ملاحظات الحضور..." />
            </div>
            <Button type="submit" disabled={saving}>{saving ? "جاري الحفظ..." : "حفظ البيانات"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
