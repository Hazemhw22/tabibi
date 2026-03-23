"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import IconArrowForward from "@/components/icon/icon-arrow-forward";
import IconLoader from "@/components/icon/icon-loader";
import IconUserPlus from "@/components/icon/icon-user-plus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function NewPatientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    whatsapp: "",
    email: "",
    gender: "",
    dateOfBirth: "",
    address: "",
    bloodType: "",
    allergies: "",
    notes: "",
    fileNumber: "",
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("الاسم مطلوب");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/clinic/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("تم إضافة المريض بنجاح");
        router.push("/dashboard/doctor/patients");
        router.refresh();
      } else {
        toast.error(data.error || "حدث خطأ");
      }
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/dashboard/doctor/patients"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <IconArrowForward className="h-4 w-4" />
        العودة لقائمة المرضى
      </Link>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="bg-gray-50/80 border-b border-gray-100">
          <CardTitle className="flex items-center gap-2 text-lg">
            <IconUserPlus className="h-5 w-5 text-blue-600" />
            إضافة مريض جديد
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">بيانات المريض في العيادة (اسم، رقم هاتف، بريد، رقم ملف، ملاحظات)</p>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="الاسم الكامل *"
                placeholder="محمد أحمد"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
              <Input
                label="رقم الملف"
                placeholder="001"
                value={form.fileNumber}
                onChange={(e) => set("fileNumber", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="رقم الهاتف"
                placeholder="0599xxxxxx (لإرسال رسائل SMS للدفعات والديون)"
                value={form.whatsapp}
                onChange={(e) => set("whatsapp", e.target.value)}
                dir="ltr"
              />
              <Input
                label="البريد الإلكتروني"
                type="email"
                placeholder="example@email.com"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                dir="ltr"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">الجنس</label>
                <select
                  value={form.gender}
                  onChange={(e) => set("gender", e.target.value)}
                  className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">— اختر —</option>
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
              </div>
              <Input
                label="تاريخ الميلاد"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => set("dateOfBirth", e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">فصيلة الدم</label>
                <select
                  value={form.bloodType}
                  onChange={(e) => set("bloodType", e.target.value)}
                  className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">— اختر —</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            <Input
              label="العنوان"
              placeholder="الخليل، حي البلد"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">الحساسيات / التنبيهات</label>
              <input
                placeholder="مثل: حساسية من البنسلين..."
                value={form.allergies}
                onChange={(e) => set("allergies", e.target.value)}
                className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">ملاحظات</label>
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                placeholder="أي معلومات إضافية..."
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={loading} size="lg">
                {loading ? (
                  <>
                    <IconLoader className="h-4 w-4 animate-spin ml-2" />
                    جاري الحفظ...
                  </>
                ) : (
                  "إضافة المريض"
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push("/dashboard/doctor/patients")} size="lg">
                إلغاء
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
