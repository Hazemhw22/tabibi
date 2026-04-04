"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import IconMail from "@/components/icon/icon-mail";
import IconPhone from "@/components/icon/icon-phone";
import IconArrowForward from "@/components/icon/icon-arrow-forward";
import IconLoader from "@/components/icon/icon-loader";
import IconLock from "@/components/icon/icon-lock";
import IconCheck from "@/components/icon/icon-check";
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

type Step = "input" | "verify" | "reset" | "done";

export function ForgotPasswordClient({
  title = "نسيت كلمة المرور",
  description = "أدخل البريد الإلكتروني أو رقم الهاتف المسجّل في الحساب. سنرسل رمز تأكيد لهاتفك لتغيير كلمة المرور.",
  loginLabel = "بريد أو هاتف",
  loginPlaceholder = "example@mail.com أو 059...",
  preferEmail = false,
}: Props) {
  const [step, setStep] = useState<Step>("input");
  const [phone, setPhone] = useState("");
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newValues = [...otpValues];
    newValues[index] = value.slice(-1);
    setOtpValues(newValues);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6).replace(/\D/g, "");
    const newValues = [...otpValues];
    pastedData.split("").forEach((char, i) => {
      if (i < 6) newValues[i] = char;
    });
    setOtpValues(newValues);
    if (pastedData.length > 0) {
      otpRefs.current[Math.min(pastedData.length, 5)]?.focus();
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error("أدخل رقم الهاتف");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-otp", phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "فشل إرسال الرمز");
        return;
      }
      toast.success(data.message || "تم إرسال رمز التأكيد");
      setStep("verify");
    } catch {
      toast.error("حدث خطأ. يرجى المحاولة لاحقاً.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpValues.join("");
    if (code.length < 6) {
      toast.error("أدخل رمز التأكيد كاملاً");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify-otp", phone: phone.trim(), code }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "رمز غير صحيح");
        return;
      }
      toast.success("تم تأكيد الرمز بنجاح");
      setStep("reset");
    } catch {
      toast.error("حدث خطأ في التحقق من الرمز.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("كلمة المرور غير متطابقة");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset-password",
          phone: phone.trim(),
          code: otpValues.join(""),
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "فشل تحديث كلمة المرور");
        return;
      }
      toast.success("تم تحديث كلمة المرور بنجاح");
      setStep("done");
    } catch {
      toast.error("حدث خطأ في تحديث كلمة المرور.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl border-0">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>
          {step === "input" && description}
          {step === "verify" && `أدخل رمز التأكيد المكون من 6 أرقام المرسل إلى ${phone}`}
          {step === "reset" && "أدخل كلمة المرور الجديدة لحسابك"}
          {step === "done" && "تم استعادة حسابك بنجاح"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {step === "input" && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <Input
              label={loginLabel}
              type="text"
              placeholder={loginPlaceholder}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              icon={<IconPhone className="h-4 w-4" />}
              dir="ltr"
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <IconLoader className="h-4 w-4 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <IconPhone className="h-4 w-4" />
                  إرسال رمز التأكيد
                </>
              )}
            </Button>
          </form>
        )}

        {step === "verify" && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="flex justify-center gap-2" dir="ltr" onPaste={handlePaste}>
              {otpValues.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { otpRefs.current[idx] = el; }}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="w-12 h-14 text-center text-xl font-bold border-2 rounded-lg bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none dark:bg-slate-800 dark:border-slate-700 dark:focus:border-blue-400 transition-all"
                />
              ))}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <IconLoader className="h-4 w-4 animate-spin" />
                  جاري التحقق...
                </>
              ) : (
                <>
                  <IconCheck className="h-4 w-4" />
                  تأكيد الرمز
                </>
              )}
            </Button>
            <button
              type="button"
              onClick={() => setStep("input")}
              className="text-sm text-blue-600 block mx-auto hover:underline"
            >
              تغيير رقم الهاتف
            </button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <Input
              label="كلمة المرور الجديدة"
              type="password"
              placeholder="******"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              icon={<IconLock className="h-4 w-4" />}
            />
            <Input
              label="تأكيد كلمة المرور"
              type="password"
              placeholder="******"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={<IconLock className="h-4 w-4" />}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <IconLoader className="h-4 w-4 animate-spin" />
                  جاري التحديث...
                </>
              ) : (
                <>
                  <IconLock className="h-4 w-4" />
                  تحديث كلمة المرور
                </>
              )}
            </Button>
          </form>
        )}

        {step === "done" && (
          <div className="text-center py-4 space-y-4">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <IconCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-slate-400">
              تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.
            </p>
            <Link href="/login">
              <Button variant="outline" className="gap-2 w-full">
                <IconArrowForward className="h-4 w-4" />
                العودة لتسجيل الدخول
              </Button>
            </Link>
          </div>
        )}

        {step !== "done" && (
          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-blue-600 dark:text-blue-400">
              العودة لتسجيل الدخول
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
