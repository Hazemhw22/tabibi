"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EyeOff } from "lucide-react";
import IconEye from "@/components/icon/icon-eye";
import IconPhone from "@/components/icon/icon-phone";
import IconLock from "@/components/icon/icon-lock";
import IconLoader from "@/components/icon/icon-loader";
import IconInfoCircle from "@/components/icon/icon-info-circle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { authLabelClass, authPasswordInputClass, authPasswordToggleClass } from "@/lib/auth-ui-classes";

const schema = z.object({
  phone: z.string().min(9, "رقم الهاتف غير صالح"),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل"),
});

type FormData = z.infer<typeof schema>;

function LoginPatientForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const rateLimited = searchParams.get("error") === "rate_limited";
  
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [password, setPassword] = useState("");
  const [loginMode, setLoginMode] = useState<"otp" | "password">("otp");
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length < 9) {
      toast.error("يرجى إدخال رقم هاتف صحيح");
      return;
    }
    setSendingOtp(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("تم إرسال رمز التحقق بنجاح ✓");
        setStep("otp");
      } else {
        toast.error(data.error || "فشل إرسال رمز التحقق");
      }
    } catch {
      toast.error("خطأ في الاتصال بالسيرفر");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        login: phoneNumber.trim(),
        password: loginMode === "password" ? password : "",
        token: loginMode === "otp" ? otpToken : "",
        redirect: false,
      });
      
      if (result?.error) {
        toast.error(loginMode === "otp" ? "رمز التحقق غير صحيح" : "رقم الهاتف أو كلمة المرور غير صحيحة");
      } else {
        toast.success("تم تسجيل الدخول بنجاح!");
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      toast.error("حدث خطأ، يرجى المحاولة مجدداً");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden bg-white/95 backdrop-blur-sm dark:bg-slate-900/95">
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
      {rateLimited && (
        <div className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-200">
          <IconInfoCircle className="h-4 w-4 shrink-0" />
          <span>تم تجاوز الحد المسموح من المحاولات. يرجى المحاولة مرة أخرى بعد 15 دقيقة.</span>
        </div>
      )}
      <CardHeader className="text-center pb-2 pt-6">
        <CardTitle className="text-2xl font-bold bg-gradient-to-br from-slate-900 to-slate-600 bg-clip-text text-transparent dark:from-white dark:to-slate-400">
          {step === "otp" ? "التحقق من رقم الهاتف" : "تسجيل دخول المريض"}
        </CardTitle>
        <CardDescription className="text-base mt-1 text-slate-500 dark:text-slate-400">
          {step === "otp" 
            ? `أدخل رمز التحقق المرسل إلى ${phoneNumber}` 
            : loginMode === "otp" ? "ادخل رقم هاتفك لنرسل لك كود التأكيد" : "ادخل رقم هاتفك وكلمة المرور"}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-4 px-6 pb-8">
        {step === "phone" ? (
          <form onSubmit={loginMode === "otp" ? handleSendOtp : handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 mr-1">رقم الهاتف</label>
              <div className="relative group">
                <div className="absolute inset-y-0 right-3 flex items-center text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <IconPhone className="h-4.5 w-4.5" />
                </div>
                <input
                  type="tel"
                  placeholder="0599123456"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-4 text-base transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900 dark:focus:ring-blue-900/20"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            {loginMode === "password" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">كلمة المرور</label>
                  <Link href="/forgot-password/patient" className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400">
                    نسيت كلمة المرور؟
                  </Link>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 right-3 flex items-center text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <IconLock className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-12 text-base transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900 dark:focus:ring-blue-900/20"
                    dir="ltr"
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 left-0 flex items-center px-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <IconEye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-blue-200 dark:shadow-none" size="lg" disabled={loading || sendingOtp}>
              {sendingOtp ? <><IconLoader className="h-4 w-4 animate-spin ml-2" /> جاري الإرسال...</> : 
               loading ? <><IconLoader className="h-4 w-4 animate-spin ml-2" /> جاري الدخول...</> : 
               loginMode === "otp" ? "إرسال رمز التحقق" : "تسجيل الدخول"}
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100 dark:border-slate-800" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 dark:bg-slate-900">أو</span></div>
            </div>

            <button
              type="button"
              onClick={() => setLoginMode(loginMode === "otp" ? "password" : "otp")}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/50"
            >
              {loginMode === "otp" ? "تسجيل الدخول بكلمة المرور" : "تسجيل الدخول بكود التأكيد (أسهل)"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-3">
              <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                أدخل الكود المكون من 6 أرقام
              </p>
              <div className="flex justify-center">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="0 0 0 0 0 0"
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, ""))}
                  className="h-14 w-full max-w-[200px] rounded-2xl border-2 border-slate-200 bg-slate-50 text-center text-3xl font-bold tracking-[0.5em] transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-800/50 dark:focus:border-blue-500 dark:focus:bg-slate-900"
                  dir="ltr"
                  autoFocus
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-blue-200 dark:shadow-none" size="lg" disabled={loading}>
              {loading ? <><IconLoader className="h-4 w-4 animate-spin ml-2" /> جاري التحقق...</> : "تأكيد الدخول"}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setStep("phone")}
                className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                تغيير رقم الهاتف
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            ليس لديك حساب؟{" "}
            <Link href="/register/patient" className="font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400">
              إنشاء حساب مريض
            </Link>
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-xs font-semibold text-slate-400">
            <Link href="/login/doctor" className="hover:text-violet-500 transition-colors">دخول الطبيب</Link>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <Link href="/login/medical-center" className="hover:text-sky-500 transition-colors">مركز طبي</Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPatientPage() {
  return (
    <Suspense fallback={<Card className="w-full max-w-md shadow-xl border-0"><CardContent className="py-12 flex justify-center"><IconLoader className="h-8 w-8 animate-spin text-gray-400" /></CardContent></Card>}>
      <LoginPatientForm />
    </Suspense>
  );
}
