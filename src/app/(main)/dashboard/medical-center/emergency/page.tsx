"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Siren, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";

type Visit = {
  id: string;
  patientName: string;
  complaint?: string | null;
  amount: number;
  paymentStatus: string;
  paymentMethod?: string | null;
  createdAt: string;
};

export default function EmergencyPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    patientName: "",
    complaint: "",
    amount: "",
    paymentMethod: "نقدي",
    paymentStatus: "UNPAID" as "UNPAID" | "PAID",
    notes: "",
  });

  const load = () => {
    setLoading(true);
    fetch("/api/medical-center/emergency")
      .then((r) => r.json())
      .then((j) => {
        if (j.visits) setVisits(j.visits);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.patientName.trim() || Number.isNaN(amount) || amount < 0) {
      toast.error("أدخل الاسم والمبلغ بشكل صحيح");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/medical-center/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: form.patientName.trim(),
          complaint: form.complaint.trim() || undefined,
          amount,
          paymentMethod: form.paymentMethod || undefined,
          paymentStatus: form.paymentStatus,
          notes: form.notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "فشل الحفظ");
        return;
      }
      toast.success("تم تسجيل الزيارة");
      setForm({
        patientName: "",
        complaint: "",
        amount: "",
        paymentMethod: "نقدي",
        paymentStatus: "UNPAID",
        notes: "",
      });
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <Link href="/dashboard/medical-center" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
        ← الرئيسية
      </Link>
      <h1 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Siren className="h-6 w-6 text-amber-600" />
        قسم الطوارئ (بدون حجز مسبق)
      </h1>

      <Card className="mb-8 border-amber-200">
        <CardHeader>
          <CardTitle className="text-base">تسجيل حالة جديدة</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">اسم المريض</label>
              <Input
                value={form.patientName}
                onChange={(e) => setForm((f) => ({ ...f, patientName: e.target.value }))}
                required
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">الشكوى / المرض</label>
              <Input
                value={form.complaint}
                onChange={(e) => setForm((f) => ({ ...f, complaint: e.target.value }))}
                className="mt-1"
                placeholder="وصف مختصر"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">التكلفة (₪)</label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">طريقة الدفع</label>
                <Input
                  value={form.paymentMethod}
                  onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">حالة الدفع</label>
              <select
                value={form.paymentStatus}
                onChange={(e) =>
                  setForm((f) => ({ ...f, paymentStatus: e.target.value as "UNPAID" | "PAID" }))
                }
                className="mt-1 w-full h-10 border rounded-lg px-3 text-sm"
              >
                <option value="UNPAID">غير مدفوع</option>
                <option value="PAID">مدفوع</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">ملاحظات</label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="mt-1"
              />
            </div>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              حفظ
            </Button>
          </form>
        </CardContent>
      </Card>

      <h2 className="font-semibold text-gray-800 mb-3">آخر الزيارات</h2>
      {loading ? (
        <p className="text-gray-500 text-sm">جاري التحميل...</p>
      ) : visits.length === 0 ? (
        <p className="text-gray-500 text-sm">لا توجد سجلات.</p>
      ) : (
        <ul className="space-y-2">
          {visits.map((v) => (
            <li key={v.id}>
              <Card>
                <CardContent className="p-4 flex flex-wrap justify-between gap-2 text-sm">
                  <div>
                    <div className="font-medium">{v.patientName}</div>
                    {v.complaint && <div className="text-gray-600">{v.complaint}</div>}
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-green-700">₪{v.amount}</div>
                    <div className="text-xs text-gray-500">{v.paymentStatus}</div>
                    <div className="text-xs text-gray-400">
                      {formatDateTime(v.createdAt)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
