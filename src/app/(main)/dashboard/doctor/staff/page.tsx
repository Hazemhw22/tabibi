"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import IconMenuUsers from "@/components/icon/menu/icon-menu-users";
import IconLoader from "@/components/icon/icon-loader";
import IconPencil from "@/components/icon/icon-pencil";
import IconPlus from "@/components/icon/icon-plus";
import IconPrinter from "@/components/icon/icon-printer";
import IconTrash from "@/components/icon/icon-trash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { DOCTOR_STAFF_ROLE_LABELS, isDoctorStaffRole } from "@/lib/doctor-team-roles";
import { printHtmlDocument } from "@/lib/print-html";
import { cn } from "@/lib/utils";

type StaffRow = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  doctorStaffRole?: string | null;
  salaryMonthly?: number | null;
  createdAt?: string | null;
};

function staffRoleLabel(u: StaffRow): string {
  if (u.doctorStaffRole) return DOCTOR_STAFF_ROLE_LABELS[u.doctorStaffRole] ?? u.doctorStaffRole;
  return DOCTOR_STAFF_ROLE_LABELS[u.role ?? ""] ?? u.role ?? "—";
}

function buildStaffPdfHtml(rows: StaffRow[]): string {
  const body = rows
    .map(
      (u, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(u.name ?? "—")}</td>
      <td dir="ltr">${escapeHtml(u.email ?? "—")}</td>
      <td dir="ltr">${escapeHtml(u.phone ?? "—")}</td>
      <td>${escapeHtml(staffRoleLabel(u))}</td>
      <td>${u.salaryMonthly != null && u.salaryMonthly > 0 ? `₪${u.salaryMonthly}` : "—"}</td>
      <td>${u.createdAt ? format(new Date(u.createdAt), "dd/MM/yyyy") : "—"}</td>
    </tr>`,
    )
    .join("");
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/><title>موظفين العيادة</title>
<style>
  body{font-family:system-ui,Tahoma,sans-serif;padding:20px;font-size:13px;}
  h1{font-size:18px;margin:0 0 8px;}
  .meta{color:#666;font-size:12px;margin-bottom:16px;}
  table{width:100%;border-collapse:collapse;}
  th,td{border:1px solid #ccc;padding:8px;text-align:right;}
  th{background:#f3f4f6;font-weight:600;}
</style></head><body>
<h1>موظفين العيادة</h1>
<p class="meta">تاريخ الطباعة: ${new Date().toLocaleString("ar")} — العدد: ${rows.length}</p>
<table>
<thead><tr><th>#</th><th>الاسم</th><th>البريد</th><th>الهاتف</th><th>الدور</th><th>راتب شهري</th><th>تاريخ الإضافة</th></tr></thead>
<tbody>${body}</tbody>
</table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function DoctorStaffPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [list, setList] = useState<StaffRow[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [listRefreshing, setListRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<StaffRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffRow | null>(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    staffKind: "RECEPTION" as "RECEPTION" | "ASSISTANT",
    salaryMonthly: "",
  });

  const resetForm = () =>
    setForm({
      email: "",
      password: "",
      name: "",
      phone: "",
      staffKind: "RECEPTION",
      salaryMonthly: "",
    });

  const staffKindFromRow = (u: StaffRow): "RECEPTION" | "ASSISTANT" =>
    u.doctorStaffRole === "ASSISTANT" || u.role === "DOCTOR_ASSISTANT" ? "ASSISTANT" : "RECEPTION";

  const openAdd = () => {
    setEditRow(null);
    resetForm();
    setAddOpen(true);
  };

  const openEdit = (u: StaffRow) => {
    setEditRow(u);
    setForm({
      email: u.email ?? "",
      password: "",
      name: u.name ?? "",
      phone: u.phone ?? "",
      staffKind: staffKindFromRow(u),
      salaryMonthly:
        u.salaryMonthly != null && Number.isFinite(u.salaryMonthly) ? String(u.salaryMonthly) : "",
    });
    setAddOpen(true);
  };

  const refreshStaffList = useCallback(() => {
    setListRefreshing(true);
    fetch("/api/doctor/staff")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) toast.error(j.error);
        else setList(j.staff ?? []);
      })
      .catch(() => toast.error("تعذر تحديث القائمة"))
      .finally(() => setListRefreshing(false));
  }, []);

  const load = useCallback(() => {
    setInitialLoading(true);
    fetch("/api/doctor/staff")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) toast.error(j.error);
        else setList(j.staff ?? []);
      })
      .catch(() => toast.error("تعذر التحميل"))
      .finally(() => setInitialLoading(false));
  }, []);

  const confirmRemoveStaff = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/doctor/staff/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "فشلت العملية");
        throw new Error("fail");
      }
      toast.success(data.message || "تم");
      refreshStaffList();
    } catch (e) {
      if (e instanceof Error && e.message === "fail") throw e;
      toast.error("حدث خطأ");
      throw new Error("fail");
    }
  };

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

  useEffect(() => {
    if (status === "loading" || !session || session.user.role !== "DOCTOR") return;
    load();
  }, [session, status, load]);

  const printPdf = () => {
    if (!list.length) {
      toast.message("لا توجد بيانات للطباعة");
      return;
    }
    printHtmlDocument(buildStaffPdfHtml(list), "staff-list");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (session?.user?.role !== "DOCTOR") return;
    setSubmitting(true);
    try {
      const salaryMonthly = form.salaryMonthly.trim() ? Number(form.salaryMonthly) : undefined;
      if (editRow) {
        const body: Record<string, unknown> = {
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          staffKind: form.staffKind,
          salaryMonthly: Number.isFinite(salaryMonthly as number) ? salaryMonthly : null,
        };
        if (form.password.trim().length >= 6) body.password = form.password;
        const res = await fetch(`/api/doctor/staff/${editRow.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "فشل التحديث");
          return;
        }
        toast.success(data.message || "تم التحديث");
        if (data.staff && editRow) {
          const row = data.staff as StaffRow;
          setList((prev) => prev.map((u) => (u.id === editRow.id ? { ...u, ...row } : u)));
        }
        setEditRow(null);
        resetForm();
        setAddOpen(false);
        return;
      }
      const res = await fetch("/api/doctor/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          name: form.name.trim(),
          phone: form.phone.trim() || undefined,
          staffKind: form.staffKind,
          salaryMonthly: Number.isFinite(salaryMonthly) ? salaryMonthly : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "فشل الإنشاء");
        return;
      }
      toast.success(data.message || "تم إنشاء حساب الموظف");
      resetForm();
      setAddOpen(false);
      refreshStaffList();
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setSubmitting(false);
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
                <IconMenuUsers className="h-5 w-5 text-blue-600" />
                موظفين العيادة
              </CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button type="button" variant="outline" className="gap-1.5" onClick={printPdf} disabled={!list.length}>
                <IconPrinter className="h-4 w-4" />
                PDF / طباعة
              </Button>
              <Button type="button" className="gap-1.5" onClick={openAdd}>
                <IconPlus className="h-4 w-4" />
                إضافة موظف
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 relative">
          {initialLoading ? (
            <div className="flex justify-center py-16">
              <IconLoader className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : list.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 py-14 text-center text-sm text-gray-400 dark:border-slate-600 dark:bg-slate-900/25 dark:text-slate-500">
              لا يوجد موظفون بعد — اضغط «إضافة موظف».
            </p>
          ) : (
            <div
              className={cn(
                "relative table-scroll-mobile -mx-2 overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-900/40 sm:mx-0 transition-opacity",
                listRefreshing && "opacity-70 pointer-events-none",
              )}
            >
              {listRefreshing && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/40 dark:bg-slate-900/30">
                  <IconLoader className="h-7 w-7 animate-spin text-blue-600" />
                </div>
              )}
              <table className="min-w-[820px] w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-right text-xs font-medium text-gray-500 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-300">
                  <tr>
                    <th className="px-3 py-3 w-10">#</th>
                    <th className="px-3 py-3">الاسم</th>
                    <th className="px-3 py-3">البريد</th>
                    <th className="px-3 py-3">الهاتف</th>
                    <th className="px-3 py-3">الدور</th>
                    <th className="px-3 py-3 whitespace-nowrap">الراتب (₪)</th>
                    <th className="px-3 py-3 whitespace-nowrap">تاريخ الإضافة</th>
                    <th className="px-3 py-3 w-[88px] whitespace-nowrap">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/80">
                  {list.map((u, i) => (
                    <tr key={u.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/35">
                      <td className="px-3 py-3 text-gray-400 tabular-nums">{i + 1}</td>
                      <td className="px-3 py-3 font-medium text-gray-900 dark:text-slate-100">{u.name ?? "—"}</td>
                      <td className="px-3 py-3 text-gray-600" dir="ltr">
                        {u.email ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-gray-600" dir="ltr">
                        {u.phone ?? "—"}
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-slate-800">
                          {staffRoleLabel(u)}
                        </span>
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {u.salaryMonthly != null && u.salaryMonthly > 0 ? `₪${u.salaryMonthly}` : "—"}
                      </td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap dark:text-slate-400">
                        {u.createdAt ? format(new Date(u.createdAt), "dd/MM/yyyy") : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-0.5">
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
                            onClick={() => setDeleteTarget(u)}
                            aria-label="إلغاء الربط"
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

      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) setEditRow(null);
        }}
      >
        <DialogContent className={cn("max-h-[90vh] overflow-y-auto sm:max-w-lg")} dir="rtl">
          <DialogHeader>
            <DialogTitle>{editRow ? "تعديل موظف" : "إضافة موظف"}</DialogTitle>
            <DialogDescription>
              {editRow
                ? "تحديث الاسم والهاتف والدور والراتب المرجعي. اترك كلمة المرور فارغة إن لم ترد تغييرها."
                : "يُنشأ حساب دخول جديد للموظف. يمكنه بعدها تسجيل الدخول بالبريد وكلمة المرور التي تحددها."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>الاسم</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  minLength={2}
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>البريد (اسم المستخدم)</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  required={!editRow}
                  readOnly={!!editRow}
                  className={cn("mt-1", editRow && "bg-gray-50 dark:bg-slate-800/80")}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>{editRow ? "كلمة مرور جديدة (اختياري)" : "كلمة المرور"}</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  required={!editRow}
                  minLength={editRow ? 0 : 6}
                  placeholder={editRow ? "اتركه فارغاً للإبقاء على الحالية" : undefined}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>هاتف (اختياري)</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>الدور</Label>
                <select
                  value={form.staffKind}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, staffKind: e.target.value as "RECEPTION" | "ASSISTANT" }))
                  }
                  className="mt-1 flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-900"
                >
                  <option value="RECEPTION">استقبال</option>
                  <option value="ASSISTANT">مساعد طبيب</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label>راتب شهري مرجعي (₪، اختياري)</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={form.salaryMonthly}
                  onChange={(e) => setForm((p) => ({ ...p, salaryMonthly: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAddOpen(false);
                  setEditRow(null);
                }}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting ? <IconLoader className="h-4 w-4 animate-spin" /> : null}
                {editRow ? "حفظ التعديلات" : "إنشاء الحساب"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="إلغاء ربط الموظف؟"
        description={
          deleteTarget
            ? `سيتم إلغاء ربط «${deleteTarget.name ?? deleteTarget.email ?? "الموظف"}» بعيادتك. لن يعد بإمكانه تسجيل الدخول كموظف (يُحوَّل الحساب إلى صلاحية مريض).`
            : ""
        }
        confirmLabel="نعم، ألغِ الربط"
        cancelLabel="إلغاء"
        variant="destructive"
        onConfirm={confirmRemoveStaff}
      />
    </div>
  );
}
