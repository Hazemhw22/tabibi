"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("أدخل البريد الإلكتروني");
      return;
    }
    setLoading(true);
    try {
      // يمكن ربطه لاحقاً بـ Supabase Auth: supabase.auth.resetPasswordForEmail(email)
      await new Promise((r) => setTimeout(r, 1000));
      setSent(true);
      toast.success("إذا كان البريد مسجلاً سنرسل لك رابط إعادة تعيين كلمة المرور.");
    } catch {
      toast.error("حدث خطأ. يرجى المحاولة لاحقاً.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl border-0">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">استعادة كلمة المرور</CardTitle>
        <CardDescription>أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {sent ? (
          <div className="text-center py-4">
            <p className="text-gray-600 text-sm mb-4">تحقق من بريدك الإلكتروني واتبع الرابط لإعادة تعيين كلمة المرور.</p>
            <Link href="/login">
              <Button variant="outline" className="gap-2">
                <ArrowRight className="h-4 w-4" />
                العودة لتسجيل الدخول
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="البريد الإلكتروني"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              dir="ltr"
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {loading ? "جاري الإرسال..." : "إرسال رابط الاستعادة"}
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
