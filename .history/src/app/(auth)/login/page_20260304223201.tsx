"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
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
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">مرحباً بعودتك</CardTitle>
        <CardDescription>سجّل دخولك للوصول إلى حسابك</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="البريد الإلكتروني"
            type="email"
            placeholder="example@email.com"
            icon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            {...register("email")}
            dir="ltr"
          />

          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              كلمة المرور
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            {errors.password && (
              <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-end">
            <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
              نسيت كلمة المرور؟
            </Link>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري تسجيل الدخول...
              </>
            ) : (
              "تسجيل الدخول"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            ليس لديك حساب؟{" "}
            <Link href="/register" className="text-blue-600 font-medium hover:underline">
              إنشاء حساب جديد
            </Link>
          </p>
        </div>

        {/* Demo accounts */}
        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-xs font-semibold text-blue-700 mb-2">حسابات تجريبية:</p>
          <div className="space-y-1 text-xs text-blue-600">
            <p>مريض: patient@demo.com / 123456</p>
            <p>طبيب: doctor@demo.com / 123456</p>
            <p>أدمن: admin@demo.com / 123456</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
