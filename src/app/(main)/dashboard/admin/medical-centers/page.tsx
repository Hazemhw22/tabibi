"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MEDICAL_CENTER_ANNUAL_FEE_NIS } from "@/lib/subscription-pricing";
import { formatDateNumeric } from "@/lib/utils";

type Row = {
  id: string;
  name: string;
  nameAr?: string | null;
  city?: string;
  approvalStatus?: string;
  subscriptionEndDate?: string | null;
  isActive?: boolean;
  doctorsCount?: number;
  createdAt?: string;
};

export default function AdminMedicalCentersPage() {
  const [centers, setCenters] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = () => {
    fetch("/api/admin/medical-centers")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) toast.error(j.error);
        else setCenters(j.centers ?? []);
      })
      .catch(() => toast.error("تعذر التحميل"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const patch = async (id: string, approvalStatus: "APPROVED" | "REJECTED") => {
    setActing(id + approvalStatus);
    try {
      const res = await fetch(`/api/admin/medical-centers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus }),
      });
      const j = await res.json();
      if (!res.ok) {
        toast.error(j.error || "فشل");
        return;
      }
      toast.success(approvalStatus === "APPROVED" ? "تم قبول المركز وتفعيل الاشتراك السنوي" : "تم رفض الطلب");
      load();
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link href="/dashboard/admin" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
          ← لوحة الإدارة
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="h-8 w-8 text-sky-600" />
          المراكز الطبية
        </h1>
        <p className="text-gray-600 mt-1">
          الموافقة على تسجيل مركز جديد: اشتراك سنوي مع الأطباء للمركز — {MEDICAL_CENTER_ANNUAL_FEE_NIS} ₪ لمدة سنة.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">القائمة</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              جاري التحميل...
            </p>
          ) : centers.length === 0 ? (
            <p className="text-gray-500">لا توجد مراكز مسجّلة.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="p-3 font-semibold">المركز</th>
                    <th className="p-3 font-semibold">الحالة</th>
                    <th className="p-3 font-semibold">الأطباء</th>
                    <th className="p-3 font-semibold">انتهاء الاشتراك</th>
                    <th className="p-3 font-semibold">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {centers.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                      <td className="p-3">
                        <p className="font-medium">{c.nameAr || c.name}</p>
                        <p className="text-xs text-gray-500">{c.city}</p>
                      </td>
                      <td className="p-3">
                        {c.approvalStatus === "APPROVED" ? (
                          <Badge className="bg-emerald-100 text-emerald-800">معتمد</Badge>
                        ) : c.approvalStatus === "REJECTED" ? (
                          <Badge variant="destructive">مرفوض</Badge>
                        ) : (
                          <Badge variant="secondary">قيد المراجعة</Badge>
                        )}
                      </td>
                      <td className="p-3 tabular-nums">{c.doctorsCount ?? 0}</td>
                      <td className="p-3 text-xs text-gray-600">
                        {c.subscriptionEndDate ? formatDateNumeric(c.subscriptionEndDate) : "—"}
                      </td>
                      <td className="p-3">
                        {c.approvalStatus === "PENDING" && (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              className="gap-1"
                              disabled={!!acting}
                              onClick={() => patch(c.id, "APPROVED")}
                            >
                              {acting === c.id + "APPROVED" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                              قبول ({MEDICAL_CENTER_ANNUAL_FEE_NIS} ₪/سنة)
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-red-600"
                              disabled={!!acting}
                              onClick={() => patch(c.id, "REJECTED")}
                            >
                              {acting === c.id + "REJECTED" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <X className="h-3.5 w-3.5" />
                              )}
                              رفض
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
