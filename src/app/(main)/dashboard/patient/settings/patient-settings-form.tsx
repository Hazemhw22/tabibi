"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  defaultName: string;
  defaultPhone: string;
};

export function PatientSettingsForm({ defaultName, defaultPhone }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(defaultName ?? "");
  const [phone, setPhone] = useState(defaultPhone ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("الاسم مطلوب");
      return;
    }
    setLoading(true);
    try {
      const payload = { name: name.trim(), phone: phone.trim() || undefined };
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        if (typeof data.name === "string") setName(data.name);
        if (data.phone !== undefined) setPhone(data.phone ?? "");
        toast.success("تم حفظ التعديلات بنجاح.");
        router.refresh();
      } else {
        toast.error(data.error || "فشل الحفظ");
      }
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          تعديل بياناتي
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="الاسم"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="الاسم الكامل"
            required
            minLength={2}
            maxLength={100}
          />
          <Input
            label="رقم الهاتف / الواتساب (اختياري)"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="مثال: 0599123456"
            dir="ltr"
          />
          <Button type="submit" disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            حفظ التعديلات
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
