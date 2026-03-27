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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        login: data.phone.trim(),
        password: data.password,
        redirect: false,
      });
      if (result?.error) {
        toast.error("رقم الهاتف أو كلمة المرور غير صحيحة");
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
    <Card className="w-full max-w-md shadow-xl border-0">
      {rateLimited && (
        <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-200">
          <IconInfoCircle className="h-4 w-4 shrink-0" />
          <span>تم تجاوز الحد المسموح من المحاولات. يرجى المحاولة مرة أخرى بعد 15 دقيقة.</span>
        </div>
      )}
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">تسجيل دخول المريض</CardTitle>
        <CardDescription className="text-base mt-1">ادخل رقم هاتفك وكلمة المرور</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="رقم الهاتف"
            type="tel"
            placeholder="05991234567"
            icon={<IconPhone className="h-4 w-4" />}
            error={errors.phone?.message}
            autoComplete="tel"
            {...register("phone")}
            dir="ltr"
          />
          <div className="w-full">
            <label className={authLabelClass}>كلمة المرور</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400 dark:text-slate-500">
                <IconLock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className={authPasswordInputClass}
                autoComplete="current-password"
                {...register("password")}
                dir="ltr"
              />
              <button
                type="button"
                className={authPasswordToggleClass}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>}
            <div className="text-left">
              <Link href="/forgot-password/patient" className="text-sm text-blue-600 dark:text-blue-400">
                نسيت كلمة المرور؟
              </Link>
            </div>
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? <><IconLoader className="h-4 w-4 animate-spin" /> جاري تسجيل الدخول...</> : "تسجيل الدخول"}
          </Button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-base text-gray-600 dark:text-slate-400">
            ليس لديك حساب؟{" "}
            <Link href="/register/patient" className="font-semibold text-blue-600 dark:text-blue-400">
              إنشاء حساب مريض
            </Link>
          </p>
          <p className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-slate-500">
            <Link href="/login/doctor" className="dark:hover:text-slate-300">
              تسجيل دخول الطبيب
            </Link>
            <span className="text-gray-300 dark:text-slate-600">·</span>
            <Link href="/login/medical-center" className="text-sky-600 dark:text-sky-400">
              مركز طبي
            </Link>
          </p>
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
