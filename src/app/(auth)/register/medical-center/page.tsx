"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function RegisterMedicalCenterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    centerName: "",
    centerAddress: "",
    centerCity: "الخليل",
    centerPhone: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/register/medical-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "فشل التسجيل");
        return;
      }
      toast.success(data.message ?? "تم إنشاء الحساب. سجّل الدخول بعد موافقة الإدارة.");
      router.push("/login");
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg shadow-xl border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Building2 className="h-6 w-6 text-blue-600" />
          تسجيل مركز طبي
        </CardTitle>
        <CardDescription>
          أنشئ حساب مشرف المركز. بعد موافقة مشرف المنصة يُفعَّل الاشتراك السنوي للمركز مع الأطباء (1500 ₪
          لمدة سنة). حتى ذلك الحين تبقى لوحة التحكم محدودة حتى يتم القبول.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">اسم المسؤول</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">البريد الإلكتروني</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">كلمة المرور</label>
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
            <label className="text-sm font-medium">هاتف المسؤول</label>
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              required
              className="mt-1"
            />
          </div>
          <hr className="border-gray-200" />
          <div>
            <label className="text-sm font-medium">اسم المركز</label>
            <Input
              value={form.centerName}
              onChange={(e) => setForm((f) => ({ ...f, centerName: e.target.value }))}
              required
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">عنوان المركز</label>
            <Input
              value={form.centerAddress}
              onChange={(e) => setForm((f) => ({ ...f, centerAddress: e.target.value }))}
              required
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">المدينة</label>
              <Input
                value={form.centerCity}
                onChange={(e) => setForm((f) => ({ ...f, centerCity: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">هاتف المركز (اختياري)</label>
              <Input
                value={form.centerPhone}
                onChange={(e) => setForm((f) => ({ ...f, centerPhone: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            إنشاء الحساب
          </Button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          <Link href="/register" className="text-blue-600 hover:underline">
            أنواع تسجيل أخرى
          </Link>
          {" · "}
          <Link href="/login" className="text-blue-600 hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
