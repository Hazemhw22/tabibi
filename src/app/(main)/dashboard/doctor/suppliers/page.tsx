"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import IconShoppingBag from "@/components/icon/icon-shopping-bag";
import IconLoader from "@/components/icon/icon-loader";
import IconPlus from "@/components/icon/icon-plus";
import IconPencil from "@/components/icon/icon-pencil";
import IconTrash from "@/components/icon/icon-trash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { isDoctorStaffRole } from "@/lib/doctor-team-roles";

type SupplierRow = {
  id: string;
  name: string;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  totalPurchases?: number;
};

const emptyForm = () => ({
  name: "",
  companyName: "",
  phone: "",
  email: "",
  notes: "",
});

export default function DoctorSuppliersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [list, setList] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<SupplierRow | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (isDoctorStaffRole(session.user.role)) {
      router.replace("/dashboard/doctor/appointments");
      return;
    }
    if (session.user.role !== "DOCTOR") {
      router.replace("/");
    }
  }, [session, status, router]);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/doctor/suppliers")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) toast.error(j.error);
        else setList(j.suppliers ?? []);
      })
      .catch(() => toast.error("تعذر التحميل"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (status === "loading" || !session || session.user.role !== "DOCTOR") return;
    load();
  }, [session, status, load]);

  const openAdd = () => {
    setForm(emptyForm());
    setAddOpen(true);
  };

  const openEdit = (row: SupplierRow) => {
    setEditRow(row);
    setForm({
      name: row.name ?? "",
      companyName: row.companyName ?? "",
      phone: row.phone ?? "",
      email: row.email ?? "",
      notes: row.notes ?? "",
    });
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (session?.user?.role !== "DOCTOR") return;
    if (!form.name.trim()) {
      toast.error("الاسم مطلوب");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/doctor/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          companyName: form.companyName.trim() || undefined,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "فشل الحفظ");
        return;
      }
      toast.success(data.message || "تمت الإضافة");
      setAddOpen(false);
      setForm(emptyForm());
      load();
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRow || session?.user?.role !== "DOCTOR") return;
    if (!form.name.trim()) {
      toast.error("الاسم مطلوب");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/doctor/suppliers/${editRow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          companyName: form.companyName.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() ? form.email.trim() : null,
          notes: form.notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "فشل التحديث");
        return;
      }
      toast.success("تم التحديث");
      setEditRow(null);
      setForm(emptyForm());
      load();
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (row: SupplierRow) => {
    if (!confirm(`حذف المزوّد «${row.name}»؟`)) return;
    try {
      const res = await fetch(`/api/doctor/suppliers/${row.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "فشل الحذف");
        return;
      }
      toast.success("تم الحذف");
      load();
    } catch {
      toast.error("حدث خطأ");
    }
  };

  if (status === "loading" || !session || session.user.role !== "DOCTOR") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <IconLoader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/dashboard/doctor"
        className="mb-6 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
      >
        ← الرئيسية
      </Link>

      <Card className="border border-gray-200 shadow-sm dark:border-slate-700 dark:bg-slate-900/35">
        <CardHeader className="border-b border-gray-100 bg-gray-50/80 dark:border-slate-700 dark:bg-slate-800/45">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <IconShoppingBag className="h-5 w-5 text-emerald-600" />
                مزوّدون مستلزمات العيادة
              </CardTitle>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                جهات الاتصال بمزوّدي المعدات والمستلزمات (للمرجعة والتواصل — لا يُربط بحسابات مستخدمين).
              </p>
            </div>
            <Button type="button" className="gap-1.5 shrink-0" onClick={openAdd}>
              <IconPlus className="h-4 w-4" />
              إضافة مزوّد
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <IconLoader className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : list.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 py-14 text-center text-sm text-gray-400 dark:border-slate-600 dark:bg-slate-900/25 dark:text-slate-500">
              لا يوجد مزوّدون بعد — اضغط «إضافة مزوّد» لتسجيل شركة أو جهة تزوّدك بالمستلزمات.
            </p>
          ) : (
            <div className="table-scroll-mobile -mx-2 overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-900/40 sm:mx-0">
              <table className="min-w-[880px] w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-right text-xs font-medium text-gray-500 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-300">
                  <tr>
                    <th className="px-3 py-3 w-10">#</th>
                    <th className="px-3 py-3">الاسم</th>
                    <th className="px-3 py-3">الشركة / المنشأة</th>
                    <th className="px-3 py-3 whitespace-nowrap">إجمالي المشتريات</th>
                    <th className="px-3 py-3">الهاتف</th>
                    <th className="px-3 py-3">البريد</th>
                    <th className="px-3 py-3 max-w-[200px]">ملاحظات</th>
                    <th className="px-3 py-3 whitespace-nowrap">آخر تحديث</th>
                    <th className="px-3 py-3 w-24">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/80">
                  {list.map((u, i) => (
                    <tr key={u.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/35">
                      <td className="px-3 py-3 text-gray-400 tabular-nums">{i + 1}</td>
                      <td className="px-3 py-3 font-medium text-gray-900 dark:text-slate-100">
                        <Link
                          href={`/dashboard/doctor/suppliers/${u.id}`}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {u.name}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-gray-600">{u.companyName ?? "—"}</td>
                      <td className="px-3 py-3 tabular-nums font-medium text-emerald-800 dark:text-emerald-200 whitespace-nowrap">
                        ₪{(u.totalPurchases ?? 0).toLocaleString("ar-EG")}
                      </td>
                      <td className="px-3 py-3 text-gray-600" dir="ltr">
                        {u.phone ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-gray-600" dir="ltr">
                        {u.email ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-xs max-w-[200px] truncate" title={u.notes ?? ""}>
                        {u.notes?.trim() ? u.notes : "—"}
                      </td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">
                        {u.updatedAt ? format(new Date(u.updatedAt), "dd/MM/yyyy") : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                            onClick={() => openEdit(u)}
                            aria-label="تعديل"
                          >
                            <IconPencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            onClick={() => remove(u)}
                            aria-label="حذف"
                          >
                            <IconTrash className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة مزوّد</DialogTitle>
            <DialogDescription>اسم جهة التوريد وبيانات التواصل (اختياري).</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitCreate} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="sup-name">الاسم *</Label>
              <Input
                id="sup-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="مثال: أحمد، أو مندوب المبيعات"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sup-co">الشركة / المحل</Label>
              <Input
                id="sup-co"
                value={form.companyName}
                onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                placeholder="اختياري"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sup-phone">الهاتف</Label>
                <Input id="sup-phone" dir="ltr" className="text-left" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sup-email">البريد</Label>
                <Input id="sup-email" dir="ltr" className="text-left" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sup-notes">ملاحظات</Label>
              <textarea
                id="sup-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="نوع التوريد، عنوان، ساعات العمل…"
                className={cn(
                  "flex min-h-[80px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400",
                  "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500",
                  "dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-400",
                )}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <IconLoader className="h-4 w-4 animate-spin" /> : "حفظ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل مزوّد</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitEdit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ed-name">الاسم *</Label>
              <Input
                id="ed-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed-co">الشركة / المحل</Label>
              <Input
                id="ed-co"
                value={form.companyName}
                onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ed-phone">الهاتف</Label>
                <Input id="ed-phone" dir="ltr" className="text-left" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ed-email">البريد</Label>
                <Input id="ed-email" dir="ltr" className="text-left" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed-notes">ملاحظات</Label>
              <textarea
                id="ed-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className={cn(
                  "flex min-h-[80px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900",
                  "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500",
                  "dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-blue-400",
                )}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setEditRow(null)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <IconLoader className="h-4 w-4 animate-spin" /> : "حفظ التعديلات"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
