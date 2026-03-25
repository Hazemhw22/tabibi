"use client";

import { useState } from "react";
import Link from "next/link";
import IconMail from "@/components/icon/icon-mail";
import IconPhone from "@/components/icon/icon-phone";
import IconArrowForward from "@/components/icon/icon-arrow-forward";
import IconLoader from "@/components/icon/icon-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

type Props = {
  title?: string;
  description?: string;
  loginLabel?: string;
  loginPlaceholder?: string;
  /** إن وُجد يُفضّل إدخال البريد فقط */
  preferEmail?: boolean;
};

export function ForgotPasswordClient({
  title = "نسيت كلمة المرور",
  description = "أدخل البريد الإلكتروني أو رقم الهاتف المسجّل في الحساب. سنرسل رابطاً لتعيين كلمة مرور جديدة.",
  loginLabel = "البريد أو رقم الهاتف",
  loginPlaceholder = "بريدك أو 05991234567",
  preferEmail = false,
}: Props) {
  const [login, setLogin] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login.trim()) {
      toast.error(preferEmail ? "أدخل البريد الإلكتروني" : "أدخل البريد أو رقم الهاتف");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: login.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok && data.error) {
        toast.error(data.error);
        return;
      }
      setSent(true);
      toast.success(data.message || "تم الطلب بنجاح");
    } catch {
      toast.error("حدث خطأ. يرجى المحاولة لاحقاً.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl border-0">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {sent ? (
          <div className="text-center py-4 space-y-4">
            <p className="text-gray-600 text-sm leading-relaxed">
              إذا كان الحساب مسجّلاً: ستصلك رسالة نصية (للمريض برقم هاتف) أو بريد إلكتروني يحتوي رابطاً لتعيين كلمة
              مرور جديدة. افتح الرابط ثم أدخل كلمة المرور وتأكيدها.
            </p>
            <Link href="/login">
              <Button variant="outline" className="gap-2">
                <IconArrowForward className="h-4 w-4" />
                العودة لتسجيل الدخول
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={loginLabel}
              type="text"
              placeholder={loginPlaceholder}
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete={preferEmail ? "email" : "username"}
              icon={preferEmail ? <IconMail className="h-4 w-4" /> : <IconPhone className="h-4 w-4" />}
              dir="ltr"
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <IconLoader className="h-4 w-4 animate-spin" /> : <IconMail className="h-4 w-4" />}
              {loading ? "جاري الإرسال..." : "إرسال رابط التعيين"}
            </Button>
          </form>
        )}
        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-blue-600 hover:underline">
            تسجيل الدخول
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
