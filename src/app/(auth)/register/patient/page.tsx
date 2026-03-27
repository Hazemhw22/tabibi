"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EyeOff } from "lucide-react";
import IconEye from "@/components/icon/icon-eye";
import IconLock from "@/components/icon/icon-lock";
import IconUser from "@/components/icon/icon-user";
import IconPhone from "@/components/icon/icon-phone";
import IconLoader from "@/components/icon/icon-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { authLabelClass, authPasswordInputClass, authPasswordToggleClass } from "@/lib/auth-ui-classes";

const schema = z
  .object({
    name: z.string().min(3, "الاسم 3 أحرف على الأقل"),
    phone: z.string().min(9, "رقم الهاتف مطلوب"),
    password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { message: "كلمتا المرور غير متطابقتين", path: ["confirmPassword"] });

type FormData = z.infer<typeof schema>;

export default function RegisterPatientPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, role: "PATIENT" }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "حدث خطأ في التسجيل");
      } else {
        toast.success("تم إنشاء الحساب بنجاح! سجّل دخولك الآن.");
        router.push("/login/patient");
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
        <CardTitle className="text-2xl">إنشاء حساب مريض</CardTitle>
        <CardDescription className="text-base mt-1">انضم واحجز مواعيد الأطباء</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="الاسم الكامل" placeholder="أحمد محمد" icon={<IconUser className="h-4 w-4" />} error={errors.name?.message} {...register("name")} />
          <Input label="رقم الهاتف" type="tel" placeholder="05991234567" icon={<IconPhone className="h-4 w-4" />} error={errors.phone?.message} {...register("phone")} dir="ltr" />
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
                autoComplete="new-password"
                {...register("password")}
                dir="ltr"
              />
              <button type="button" className={authPasswordToggleClass} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>}
          </div>
          <Input label="تأكيد كلمة المرور" type="password" placeholder="••••••••" icon={<IconLock className="h-4 w-4" />} error={errors.confirmPassword?.message} {...register("confirmPassword")} dir="ltr" />
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? <><IconLoader className="h-4 w-4 animate-spin" /> جاري إنشاء الحساب...</> : "إنشاء الحساب"}
          </Button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-base text-gray-600 dark:text-slate-400">
            لديك حساب؟{" "}
            <Link href="/login/patient" className="font-semibold text-blue-600 dark:text-blue-400">
              تسجيل الدخول
            </Link>
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-slate-500">
            <Link href="/register" className="dark:hover:text-slate-300">
              إنشاء حساب طبيب
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
