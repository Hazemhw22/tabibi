"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import IconLoader from "@/components/icon/icon-loader";
import IconLock from "@/components/icon/icon-lock";
import IconArrowForward from "@/components/icon/icon-arrow-forward";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const run = async () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash) {
        const p = new URLSearchParams(hash);
        const access_token = p.get("access_token");
        const refresh_token = p.get("refresh_token");
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) {
            setSessionError(error.message);
            return;
          }
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
          setSessionReady(true);
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
        return;
      }

      setSessionError("الرابط غير صالح أو منتهي. اطلب رابطاً جديداً من «نسيت كلمة المرور».");
    };

    void run();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (password !== confirm) {
      toast.error("تأكيد كلمة المرور غير متطابق");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
        return;
      }
      await supabase.auth.signOut();
      toast.success("تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن.");
      router.push("/login");
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl border-0">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">تعيين كلمة المرور</CardTitle>
        <CardDescription>أدخل كلمة المرور الجديدة وتأكيدها</CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {sessionError && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm p-3">
            {sessionError}
          </div>
        )}
        {!sessionReady && !sessionError && (
          <div className="flex justify-center py-8 text-gray-500 gap-2">
            <IconLoader className="h-6 w-6 animate-spin" />
            جاري التحقق من الرابط...
          </div>
        )}
        {sessionReady && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">كلمة المرور الجديدة</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                  <IconLock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="new-password"
                  dir="ltr"
                  minLength={6}
                />
              </div>
            </div>
            <Input
              label="تأكيد كلمة المرور"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              dir="ltr"
            />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <IconLoader className="h-4 w-4 animate-spin" />
              ) : (
                "حفظ كلمة المرور"
              )}
            </Button>
          </form>
        )}
        <div className="text-center pt-2">
          <Link href="/login" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
            <IconArrowForward className="h-4 w-4" />
            العودة لتسجيل الدخول
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
