"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, User, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Specialty = { id: string; name: string; nameAr: string };

const registerSchema = z.object({
  name: z.string().min(3, "الاسم يجب أن يكون 3 أحرف على الأقل"),
  email: z.string().email("البريد الإلكتروني غير صالح"),
  phone: z.string().optional(),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  confirmPassword: z.string(),
  role: z.enum(["PATIENT", "DOCTOR"]),
  specialtyId: z.string().optional(),
  whatsapp: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "كلمتا المرور غير متطابقتين",
  path: ["confirmPassword"],
}).refine((data) => data.role !== "DOCTOR" || (data.specialtyId && data.specialtyId.length > 0), {
  message: "يجب اختيار التخصص الطبي",
  path: ["specialtyId"],
}).refine((data) => data.role !== "DOCTOR" || (data.whatsapp && data.whatsapp.trim().length > 0), {
  message: "يجب إدخال رقم الواتساب",
  path: ["whatsapp"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);

  useEffect(() => {
    fetch("/api/specialties")
      .then((r) => r.json())
      .then((d) => setSpecialties(Array.isArray(d) ? d : []))
      .catch(() => setSpecialties([]));
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "PATIENT" },
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "حدث خطأ في التسجيل");
      } else {
        toast.success("تم إنشاء الحساب بنجاح! سجّل دخولك الآن.");
        router.push("/login");
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
        <CardTitle className="text-2xl">إنشاء حساب جديد</CardTitle>
        <CardDescription>انضم إلى منصة Tabibi</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Role Selection */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { value: "PATIENT", label: "مريض", icon: "🏥", desc: "احجز مواعيد الأطباء" },
            { value: "DOCTOR", label: "طبيب", icon: "👨‍⚕️", desc: "استقبل المرضى" },
          ].map((role) => (
            <button
              key={role.value}
              type="button"
              onClick={() => setValue("role", role.value as "PATIENT" | "DOCTOR")}
              className={cn(
                "p-3 rounded-xl border-2 text-right transition-all",
                selectedRole === role.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <div className="text-2xl mb-1">{role.icon}</div>
              <div className="font-semibold text-sm text-gray-800">{role.label}</div>
              <div className="text-xs text-gray-500">{role.desc}</div>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="الاسم الكامل"
            placeholder="أحمد محمد"
            icon={<User className="h-4 w-4" />}
            error={errors.name?.message}
            autoComplete="name"
            {...register("name")}
          />

          <Input
            label="البريد الإلكتروني"
            type="email"
            placeholder="example@email.com"
            icon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            autoComplete="email"
            {...register("email")}
            dir="ltr"
          />

          <Input
            label="رقم الهاتف (اختياري)"
            type="tel"
            placeholder="0599xxxxxx"
            icon={<Phone className="h-4 w-4" />}
            error={errors.phone?.message}
            autoComplete="tel"
            {...register("phone")}
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
                autoComplete="new-password"
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

          <Input
            label="تأكيد كلمة المرور"
            type="password"
            placeholder="••••••••"
            icon={<Lock className="h-4 w-4" />}
            error={errors.confirmPassword?.message}
            autoComplete="new-password"
            {...register("confirmPassword")}
            dir="ltr"
          />

          <Button type="submit" className="w-full mt-2" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري إنشاء الحساب...
              </>
            ) : (
              "إنشاء الحساب"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="text-blue-600 font-medium hover:underline">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
