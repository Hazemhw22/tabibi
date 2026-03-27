"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import IconMenuUsers from "@/components/icon/menu/icon-menu-users";
import IconTrash from "@/components/icon/icon-trash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { toast } from "sonner";
import { CENTER_ROLE_ADMIN } from "@/lib/medical-center-roles";
import LoadingScreen from "@/components/ui/loading-screen";
import { formatNumber } from "@/lib/utils";

type StaffRow = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  salaryMonthly?: number | null;
  staffType?: string | null;
  educationLevel?: string | null;
  createdAt?: string | null;
};

const ROLE_LABEL: Record<string, string> = {
  MEDICAL_CENTER_RECEPTIONIST: "استقبال",
  MEDICAL_CENTER_LAB_STAFF: "مختبر / أشعة",
};

export default function MedicalCenterStaffPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [list, setList] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    role: "MEDICAL_CENTER_RECEPTIONIST",
    salaryMonthly: "",
    educationLevel: "",
    staffType: "",
    attendanceNotes: "",
  });

  const load = useCallback(() => {
    fetch("/api/medical-center/staff")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) toast.error(j.error);
        else setList(j.staff ?? []);
      })
      .catch(() => toast.error("تعذر التحميل"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (session?.user?.role !== CENTER_ROLE_ADMIN) {
      router.replace("/dashboard/medical-center");
      return;
    }
    load();
  }, [session?.user?.role, status, router, load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        salaryMonthly: form.salaryMonthly.trim() ? Number(form.salaryMonthly) : undefined,
      };
      const res = await fetch("/api/medical-center/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "فشل الإنشاء");
        return;
      }
      toast.success(data.message || "تم");
      setOpen(false);
      setForm({
        email: "",
        password: "",
        name: "",
        phone: "",
        role: "MEDICAL_CENTER_RECEPTIONIST",
        salaryMonthly: "",
        educationLevel: "",
        staffType: "",
        attendanceNotes: "",
      });
      load();
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("إلغاء ربط هذا الموظف بالمركز؟ يبقى حسابه على المنصة كمريض.")) return;
    const res = await fetch(`/api/medical-center/staff?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "فشل");
      return;
    }
    toast.success(data.message || "تم");
    load();
  };

  if (status === "loading" || session?.user?.role !== CENTER_ROLE_ADMIN) {
    return <LoadingScreen label="جاري التحميل..." />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <Link href="/dashboard/medical-center" className="text-sm text-blue-600 mb-4 inline-block">
        ← الرئيسية
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <IconMenuUsers className="h-7 w-7 text-blue-600 shrink-0" />
          موظفو المركز
        </h1>
        <Button type="button" className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => setOpen(true)}>
          إضافة موظف
        </Button>
      </div>

     

      {loading ? (
        <p className="text-gray-500">جاري التحميل...</p>
      ) : list.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-gray-500">لا يوجد موظفون بعد.</CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 dark:bg-gray-900/50">
                <th className="text-right p-3">الاسم</th>
                <th className="text-right p-3">البريد</th>
                <th className="text-right p-3">الدور</th>
                <th className="text-right p-3">الراتب</th>
                <th className="text-right p-3 w-24">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="p-3 font-medium">
                    <Link href={`/dashboard/medical-center/staff/${s.id}`} className="text-blue-700 hover:underline dark:text-blue-400">
                      {s.name ?? "—"}
                    </Link>
                  </td>
                  <td className="p-3">{s.email ?? "—"}</td>
                  <td className="p-3">{ROLE_LABEL[s.role ?? ""] ?? s.role}</td>
                  <td className="p-3">{s.salaryMonthly != null ? `₪${formatNumber(s.salaryMonthly, { maximumFractionDigits: 2 })}` : "—"}</td>
                  <td className="p-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => void remove(s.id)}
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>موظف جديد</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>الاسم</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label>البريد</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label>كلمة المرور</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
                minLength={6}
                className="mt-1"
              />
            </div>
            <div>
              <Label>الهاتف (اختياري)</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>الدور</Label>
              <div className="mt-1">
                <DropdownSelect
                  value={form.role}
                  onChange={(v) => setForm((f) => ({ ...f, role: v }))}
                  options={[
                    { value: "MEDICAL_CENTER_RECEPTIONIST", label: "استقبال" },
                    { value: "MEDICAL_CENTER_LAB_STAFF", label: "مختبر / أشعة" },
                  ]}
                  placeholder="الدور"
                />
              </div>
            </div>
            <div>
              <Label>نوع الموظف</Label>
              <Input value={form.staffType} onChange={(e) => setForm((f) => ({ ...f, staffType: e.target.value }))} className="mt-1" placeholder="محاسب / نظافة / استقبال..." />
            </div>
            <div>
              <Label>المستوى التعليمي</Label>
              <Input value={form.educationLevel} onChange={(e) => setForm((f) => ({ ...f, educationLevel: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>الراتب الشهري (₪)</Label>
              <Input type="number" min={0} step="0.01" value={form.salaryMonthly} onChange={(e) => setForm((f) => ({ ...f, salaryMonthly: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>ملاحظات الدوام</Label>
              <Input value={form.attendanceNotes} onChange={(e) => setForm((f) => ({ ...f, attendanceNotes: e.target.value }))} className="mt-1" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "جاري الحفظ..." : "إنشاء"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
