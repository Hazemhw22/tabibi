"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل"),
});

type FormData = z.infer<typeof schema>;

function LoginDoctorForm() {
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
        <div className="mx-4 mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>تم تجاوز الحد المسموح من المحاولات. يرجى المحاولة مرة أخرى بعد 15 دقيقة.</span>
        </div>
      )}
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">تسجيل دخول الطبيب</CardTitle>
        <CardDescription className="text-base mt-1">ادخل بريدك الإلكتروني وكلمة المرور</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="البريد الإلكتروني"
            type="email"
            placeholder="doctor@example.com"
            icon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            autoComplete="email"
            {...register("email")}
            dir="ltr"
          />
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">كلمة المرور</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoComplete="current-password"
                {...register("password")}
                dir="ltr"
              />
              <button
                type="button"
                className="absolute inset-y-0 left-3 flex items-center text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> جاري تسجيل الدخول...</> : "تسجيل الدخول"}
          </Button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-base text-gray-600">
            ليس لديك حساب طبيب؟{" "}
            <Link href="/register/doctor" className="text-blue-600 font-semibold hover:underline">
              إنشاء حساب طبيب
            </Link>
          </p>
          <p className="text-sm text-gray-500 mt-2">
            <Link href="/login" className="hover:underline">تسجيل دخول المريض</Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginDoctorPage() {
  return (
    <Suspense fallback={<Card className="w-full max-w-md shadow-xl border-0"><CardContent className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></CardContent></Card>}>
      <LoginDoctorForm />
    </Suspense>
  );
}
