"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import IconDollarSignCircle from "@/components/icon/icon-dollar-sign-circle";
import IconLoader from "@/components/icon/icon-loader";
import IconPlus from "@/components/icon/icon-plus";
import IconPrinter from "@/components/icon/icon-printer";
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
import { toast } from "sonner";
import { isDoctorStaffRole } from "@/lib/doctor-team-roles";
import { printHtmlDocument } from "@/lib/print-html";
import { cn } from "@/lib/utils";

type LedgerRow = {
  id: string;
  kind: string;
  title: string;
  amount: number;
  occurredAt: string;
  notes?: string | null;
};

type StaffOpt = {
  id: string;
  name?: string | null;
  email?: string | null;
  salaryMonthly?: number | null;
};

/** PostgREST قد يعيد salary_monthly؛ القيم قد تكون رقماً أو نصاً */
function normalizeStaffRow(row: Record<string, unknown>): StaffOpt {
  const raw = row.salaryMonthly ?? row.salary_monthly;
  let salaryMonthly: number | null = null;
  if (raw != null && raw !== "") {
    const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/,/g, ""));
    if (Number.isFinite(n)) salaryMonthly = n;
  }
  return {
    id: String(row.id ?? ""),
    name: (row.name as string) ?? null,
    email: (row.email as string) ?? null,
    salaryMonthly,
  };
}

/** نص الخيار: الاسم فقط — القوائم الأصلية تقصّ النص الطويل ولا تعرض الراتب بشكل موثوق */
function staffOptionLabel(s: StaffOpt): string {
  return (s.name ?? "").trim() || s.email?.trim() || s.id;
}

const KIND_LABEL: Record<string, string> = {
  CLINIC_PURCHASE: "شراء للعيادة",
  SALARY_PAYMENT: "دفعة راتب",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildExpensesPdfHtml(rows: LedgerRow[], totalOut: number): string {
  const body = rows
    .map(
      (row, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${format(new Date(row.occurredAt), "dd/MM/yyyy")}</td>
      <td>${escapeHtml(KIND_LABEL[row.kind] ?? row.kind)}</td>
      <td>${escapeHtml(row.title)}</td>
      <td dir="ltr">−₪${Number(row.amount).toLocaleString("ar-EG")}</td>
      <td>${row.notes ? escapeHtml(row.notes) : "—"}</td>
    </tr>`,
    )
    .join("");
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/><title>مصروفات العيادة</title>
<style>
  body{font-family:system-ui,Tahoma,sans-serif;padding:20px;font-size:13px;}
  h1{font-size:18px;margin:0 0 8px;}
  .meta{color:#666;font-size:12px;margin-bottom:16px;}
  .total{font-weight:bold;margin-bottom:16px;padding:10px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;}
  table{width:100%;border-collapse:collapse;}
  th,td{border:1px solid #ccc;padding:8px;text-align:right;}
  th{background:#f3f4f6;font-weight:600;}
</style></head><body>
<h1>مصروفات العيادة</h1>
<p class="meta">تاريخ الطباعة: ${new Date().toLocaleString("ar")} — عدد السجلات: ${rows.length}</p>
<p class="total">إجمالي المصروفات: ₪${totalOut.toLocaleString("ar-EG")}</p>
<table>
<thead><tr><th>#</th><th>التاريخ</th><th>النوع</th><th>الوصف</th><th>المبلغ</th><th>ملاحظات</th></tr></thead>
<tbody>${body}</tbody>
</table>
</body></html>`;
}

export default function DoctorClinicExpensesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [entries, setEntries] = useState<LedgerRow[]>([]);
  const [totalOut, setTotalOut] = useState(0);
  const [staffList, setStaffList] = useState<StaffOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    kind: "CLINIC_PURCHASE" as "CLINIC_PURCHASE" | "SALARY_PAYMENT",
    title: "",
    amount: "",
    occurredAt: format(new Date(), "yyyy-MM-dd"),
    notes: "",
    staffUserId: "",
  });

  const resetForm = () =>
    setForm({
      kind: "CLINIC_PURCHASE",
      title: "",
      amount: "",
      occurredAt: format(new Date(), "yyyy-MM-dd"),
      notes: "",
      staffUserId: "",
    });

  const selectedStaff = useMemo(
    () => staffList.find((x) => x.id === form.staffUserId) ?? null,
    [staffList, form.staffUserId],
  );

  /** عند اختيار موظف لدفعة راتب: المبلغ من salaryMonthly المحفوظ عند إنشاء الموظف */
  const onStaffSelect = (staffId: string) => {
    if (!staffId) {
      setForm((p) => ({ ...p, staffUserId: "" }));
      return;
    }
    const s = staffList.find((x) => x.id === staffId);
    const n = s?.salaryMonthly != null ? Number(s.salaryMonthly) : NaN;
    const hasSalary = Number.isFinite(n) && n > 0;
    setForm((p) => ({
      ...p,
      staffUserId: staffId,
      amount: hasSalary ? String(n) : p.amount,
      title:
        hasSalary && !p.title.trim()
          ? `راتب ${(s?.name ?? "").trim()}`.trim() || "دفعة راتب"
          : p.title,
    }));
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

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/doctor/clinic-ledger").then((r) => r.json()),
      fetch("/api/doctor/staff").then((r) => r.json()),
    ])
      .then(([ledger, staffRes]) => {
        if (ledger.error) toast.error(ledger.error);
        else {
          setEntries(ledger.entries ?? []);
          setTotalOut(Number(ledger.totalOut ?? 0));
        }
        if (!staffRes.error) setStaffList(staffRes.staff ?? []);
      })
      .catch(() => toast.error("تعذر التحميل"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (status === "loading" || !session || session.user.role !== "DOCTOR") return;
    load();
  }, [session, status, load]);

  const printPdf = () => {
    if (!entries.length) {
      toast.message("لا توجد بيانات للطباعة");
      return;
    }
    printHtmlDocument(buildExpensesPdfHtml(entries, totalOut), "clinic-expenses");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (session?.user?.role !== "DOCTOR") return;
    const amount = Number(form.amount);
    if (!form.title.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error("أدخل عنواناً ومبلغاً صحيحاً");
      return;
    }
    if (form.kind === "SALARY_PAYMENT" && !form.staffUserId) {
      toast.error("اختر الموظف لدفعة الراتب");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/doctor/clinic-ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: form.kind,
          title: form.title.trim(),
          amount,
          occurredAt: form.occurredAt ? new Date(form.occurredAt).toISOString() : undefined,
          notes: form.notes.trim() || undefined,
          staffUserId: form.kind === "SALARY_PAYMENT" ? form.staffUserId : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "فشل الحفظ");
        return;
      }
      toast.success(data.message || "تم التسجيل");
      resetForm();
      setAddOpen(false);
      load();
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

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100 bg-gray-50/80">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <IconDollarSignCircle className="h-5 w-5 text-amber-600" />
                مصروفات العيادة
              </CardTitle>
              <p className="mt-1 text-sm text-gray-500">
                مشتريات أو دفعات رواتب — مصروف من حسابك. استخدم الجدول للمراجعة وPDF للطباعة أو الحفظ.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div
                className={cn(
                  "rounded-xl border px-4 py-2 text-center min-w-[140px]",
                  "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30",
                )}
              >
                <div className="text-[11px] text-amber-800 dark:text-amber-200">إجمالي المصروفات</div>
                <div className="text-lg font-bold tabular-nums text-amber-900 dark:text-amber-100">
                  ₪{totalOut.toLocaleString("ar-EG")}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="gap-1.5" onClick={printPdf} disabled={!entries.length}>
                  <IconPrinter className="h-4 w-4" />
                  PDF / طباعة
                </Button>
                <Button type="button" className="gap-1.5" onClick={() => { resetForm(); setAddOpen(true); }}>
                  <IconPlus className="h-4 w-4" />
                  تسجيل مصروف
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <IconLoader className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : entries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 py-14 text-center text-sm text-gray-400">
              لا توجد مصروفات مسجّلة — اضغط «تسجيل مصروف».
            </p>
          ) : (
            <div className="table-scroll-mobile -mx-2 overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700 sm:mx-0">
              <table className="min-w-[800px] w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-right text-xs font-medium text-gray-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-3 w-10">#</th>
                    <th className="px-3 py-3 whitespace-nowrap">التاريخ</th>
                    <th className="px-3 py-3 whitespace-nowrap">النوع</th>
                    <th className="px-3 py-3 min-w-[160px]">الوصف</th>
                    <th className="px-3 py-3 whitespace-nowrap">المبلغ</th>
                    <th className="px-3 py-3 min-w-[120px]">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {entries.map((row, i) => (
                    <tr key={row.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-3 text-gray-400 tabular-nums">{i + 1}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-gray-700 dark:text-slate-300">
                        {format(new Date(row.occurredAt), "dd/MM/yyyy")}
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-slate-800">
                          {KIND_LABEL[row.kind] ?? row.kind}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-medium text-gray-900 dark:text-slate-100">{row.title}</td>
                      <td className="px-3 py-3 font-bold tabular-nums text-red-600 dark:text-red-400 whitespace-nowrap">
                        −₪{Number(row.amount).toLocaleString("ar-EG")}
                      </td>
                      <td className="px-3 py-3 text-gray-600 text-xs max-w-[220px]">{row.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className={cn("max-h-[90vh] overflow-y-auto sm:max-w-xl")} dir="rtl">
          <DialogHeader>
            <DialogTitle>تسجيل مصروف</DialogTitle>
            <DialogDescription>
              شراء للعيادة أو دفعة راتب — يُحفظ كمصروف (خروج) من حسابك.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>النوع</Label>
                <select
                  value={form.kind}
                  onChange={(e) => {
                    const kind = e.target.value as "CLINIC_PURCHASE" | "SALARY_PAYMENT";
                    setForm((p) =>
                      kind === "CLINIC_PURCHASE"
                        ? { ...p, kind, staffUserId: "" }
                        : { ...p, kind },
                    );
                  }}
                  className="mt-1 flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-900"
                >
                  <option value="CLINIC_PURCHASE">شراء معدات / مستلزمات / …</option>
                  <option value="SALARY_PAYMENT">دفعة راتب موظف</option>
                </select>
              </div>
              {form.kind === "SALARY_PAYMENT" && (
                <div className="sm:col-span-2">
                  <Label>الموظف</Label>
                  <select
                    value={form.staffUserId}
                    onChange={(e) => onStaffSelect(e.target.value)}
                    required={form.kind === "SALARY_PAYMENT"}
                    className="mt-1 flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-900"
                  >
                    <option value="">— اختر —</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {staffOptionLabel(s)}
                      </option>
                    ))}
                  </select>
                  {form.staffUserId && selectedStaff && (
                    <div className="mt-2 rounded-lg border border-emerald-200/80 bg-emerald-50 px-3 py-2.5 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/40">
                      {selectedStaff.salaryMonthly != null &&
                      Number.isFinite(selectedStaff.salaryMonthly) &&
                      selectedStaff.salaryMonthly > 0 ? (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-gray-600 dark:text-slate-400">الراتب المرجعي المحفوظ</span>
                          <span
                            dir="ltr"
                            className="font-bold tabular-nums text-emerald-800 dark:text-emerald-200"
                          >
                            ₪{selectedStaff.salaryMonthly.toLocaleString("ar-EG")} / شهر
                          </span>
                        </div>
                      ) : (
                        <p className="text-amber-800 dark:text-amber-200/90">
                          لا يوجد راتب مرجعي لهذا الموظف — أدخل المبلغ يدوياً أو حدّث بياناته من «الموظفون».
                        </p>
                      )}
                    </div>
                  )}
                  <p className="mt-1 text-[11px] text-gray-500">
                    بعد الاختيار يظهر الراتب المرجعي أعلاه ويُنسخ إلى «المبلغ» إن وُجد.
                  </p>
                </div>
              )}
              <div className="sm:col-span-2">
                <Label>الوصف</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder={form.kind === "CLINIC_PURCHASE" ? "مثال: كمامات، أدوات تعقيم…" : "مثال: راتب شهر 3"}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label>المبلغ (₪)</Label>
                <Input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  required
                  className="mt-1"
                  placeholder={form.kind === "SALARY_PAYMENT" ? "يُعبأ تلقائياً عند اختيار الموظف" : undefined}
                />
              </div>
              <div>
                <Label>التاريخ</Label>
                <Input
                  type="date"
                  value={form.occurredAt}
                  onChange={(e) => setForm((p) => ({ ...p, occurredAt: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>ملاحظات (اختياري)</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting ? <IconLoader className="h-4 w-4 animate-spin" /> : null}
                حفظ
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
