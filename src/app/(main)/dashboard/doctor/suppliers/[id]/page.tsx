"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import IconShoppingBag from "@/components/icon/icon-shopping-bag";
import IconLoader from "@/components/icon/icon-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { isDoctorStaffRole } from "@/lib/doctor-team-roles";
import { cn } from "@/lib/utils";

type SupplierDetail = {
  id: string;
  name: string;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type LedgerEntry = {
  id: string;
  kind: string;
  title: string;
  amount: number;
  occurredAt: string;
  notes?: string | null;
};

function supplierLabel(s: Pick<SupplierDetail, "name" | "companyName">): string {
  const co = (s.companyName ?? "").trim();
  if (co) return co;
  return (s.name ?? "").trim() || "—";
}

export default function DoctorSupplierDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const { data: session, status } = useSession();
  const router = useRouter();
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [loading, setLoading] = useState(true);

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
    if (!id) return;
    setLoading(true);
    fetch(`/api/doctor/suppliers/${id}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) {
          toast.error(j.error);
          setSupplier(null);
          setEntries([]);
          setTotalPurchases(0);
          return;
        }
        setSupplier(j.supplier ?? null);
        setEntries(j.entries ?? []);
        setTotalPurchases(Number(j.totalPurchases ?? 0));
      })
      .catch(() => {
        toast.error("تعذر التحميل");
        setSupplier(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (status === "loading" || !session || session.user.role !== "DOCTOR" || !id) return;
    load();
  }, [session, status, id, load]);

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
        href="/dashboard/doctor/suppliers"
        className="mb-6 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
      >
        ← مزوّدون المستلزمات
      </Link>

      <Card className="border border-gray-200 shadow-sm dark:border-slate-700 dark:bg-slate-900/35">
        <CardHeader className="border-b border-gray-100 bg-gray-50/80 dark:border-slate-700 dark:bg-slate-800/45">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-lg">
                <IconShoppingBag className="h-5 w-5 text-emerald-600" />
                {supplier ? supplierLabel(supplier) : "مزوّد"}
              </CardTitle>
              {supplier && (
                <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                  {(supplier.companyName ?? "").trim() ? (
                    <>
                      جهة الاتصال: <span className="font-medium text-gray-800 dark:text-slate-200">{supplier.name}</span>
                    </>
                  ) : null}
                </p>
              )}
            </div>
            <div
              className={cn(
                "rounded-xl border px-4 py-2 text-center min-w-[160px]",
                "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30",
              )}
            >
              <div className="text-[11px] text-emerald-800 dark:text-emerald-200">إجمالي المدفوع لهذا المزوّد</div>
              <div className="text-lg font-bold tabular-nums text-emerald-900 dark:text-emerald-100">
                ₪{totalPurchases.toLocaleString("ar-EG")}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <IconLoader className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : !supplier ? (
            <p className="rounded-xl border border-dashed border-gray-200 py-14 text-center text-sm text-gray-400">
              لم يُعثر على المزوّد.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <span className="text-gray-500">الهاتف</span>
                  <p className="font-medium" dir="ltr">
                    {supplier.phone?.trim() || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">البريد</span>
                  <p className="font-medium" dir="ltr">
                    {supplier.email?.trim() || "—"}
                  </p>
                </div>
                {supplier.notes?.trim() ? (
                  <div className="sm:col-span-2">
                    <span className="text-gray-500">ملاحظات</span>
                    <p className="mt-0.5 text-gray-800 dark:text-slate-200 whitespace-pre-wrap">{supplier.notes}</p>
                  </div>
                ) : null}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-3">
                  مشتريات مسجّلة لهذا المزوّد
                </h3>
                {entries.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400 dark:border-slate-600 dark:bg-slate-900/25 dark:text-slate-500">
                    لا توجد مشتريات مرتبطة بعد — سجّل مصروفاً من{" "}
                    <Link href="/dashboard/doctor/expenses" className="font-medium text-blue-600 dark:text-blue-400">
                      مصروفات العيادة
                    </Link>{" "}
                    واختر هذا المزوّد.
                  </p>
                ) : (
                  <div className="table-scroll-mobile -mx-2 overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-900/40 sm:mx-0">
                    <table className="min-w-[640px] w-full text-sm">
                      <thead className="border-b border-gray-100 bg-gray-50 text-right text-xs font-medium text-gray-500 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-300">
                        <tr>
                          <th className="px-3 py-3 w-10">#</th>
                          <th className="px-3 py-3 whitespace-nowrap">التاريخ</th>
                          <th className="px-3 py-3 min-w-[140px]">الوصف</th>
                          <th className="px-3 py-3 whitespace-nowrap">المبلغ</th>
                          <th className="px-3 py-3 min-w-[100px]">ملاحظات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-700/80">
                        {entries.map((row, i) => (
                          <tr key={row.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/35">
                            <td className="px-3 py-3 text-gray-400 tabular-nums">{i + 1}</td>
                            <td className="px-3 py-3 whitespace-nowrap text-gray-700 dark:text-slate-300">
                              {format(new Date(row.occurredAt), "dd/MM/yyyy")}
                            </td>
                            <td className="px-3 py-3 font-medium text-gray-900 dark:text-slate-100">{row.title}</td>
                            <td className="px-3 py-3 font-bold tabular-nums text-red-600 dark:text-red-400 whitespace-nowrap">
                              −₪{Number(row.amount).toLocaleString("ar-EG")}
                            </td>
                            <td className="px-3 py-3 text-gray-600 text-xs max-w-[200px]">{row.notes ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
