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
import IconMail from "@/components/icon/icon-mail";
import IconLock from "@/components/icon/icon-lock";
import IconLoader from "@/components/icon/icon-loader";
import IconInfoCircle from "@/components/icon/icon-info-circle";
import IconBuilding from "@/components/icon/icon-building";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { authLabelClass, authPasswordInputClass, authPasswordToggleClass } from "@/lib/auth-ui-classes";

const schema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل"),
});

type FormData = z.infer<typeof schema>;

function LoginMedicalCenterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard/medical-center";
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
        login: data.email.trim(),
        password: data.password,
        redirect: false,
      });
      if (result?.error) {
        toast.error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
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
        <div className="flex justify-center mb-2">
          <div className="rounded-2xl border border-sky-100 bg-sky-50 p-3 dark:border-sky-800 dark:bg-sky-950/50">
            <IconBuilding className="h-8 w-8 text-sky-600 dark:text-sky-400" />
          </div>
        </div>
        <CardTitle className="text-2xl">تسجيل دخول المركز الطبي</CardTitle>
        <CardDescription className="text-base mt-1">
          بريد المسؤول وكلمة المرور (نفس بيانات التسجيل)
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="البريد الإلكتروني"
            type="email"
            placeholder="email@example.com"
            icon={<IconMail className="h-4 w-4" />}
            error={errors.email?.message}
            autoComplete="email"
            {...register("email")}
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
              <Link href="/forgot-password/medical-center" className="text-sm text-blue-600 dark:text-blue-400">
                نسيت كلمة المرور؟
              </Link>
            </div>
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? <><IconLoader className="h-4 w-4 animate-spin" /> جاري تسجيل الدخول...</> : "تسجيل الدخول"}
          </Button>
        </form>
        <div className="mt-6 space-y-2 text-center">
          <p className="text-base text-gray-600 dark:text-slate-400">
            ليس لديك حساب مركز طبي؟{" "}
            <Link href="/register/medical-center" className="font-semibold text-sky-600 dark:text-sky-400">
              التسجيل كمركز طبي
            </Link>
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-500">
            <Link href="/login" className="dark:hover:text-slate-300">
              أنواع تسجيل الدخول الأخرى
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginMedicalCenterPage() {
  return (
    <Suspense fallback={<Card className="w-full max-w-md shadow-xl border-0"><CardContent className="py-12 flex justify-center"><IconLoader className="h-8 w-8 animate-spin text-gray-400" /></CardContent></Card>}>
      <LoginMedicalCenterForm />
    </Suspense>
  );
}
