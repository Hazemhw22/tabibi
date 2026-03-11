"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Lock, User, Phone, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

type Specialty = { id: string; name: string; nameAr: string };

const schema = z
  .object({
    name: z.string().min(3, "الاسم 3 أحرف على الأقل"),
    email: z.string().email("البريد الإلكتروني غير صالح"),
    phone: z.string().min(9, "رقم الهاتف مطلوب (9 أرقام على الأقل)"),
    specialtyId: z.string().min(1, "اختر التخصص"),
    whatsapp: z.string().optional(),
    password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { message: "كلمتا المرور غير متطابقتين", path: ["confirmPassword"] });

type FormData = z.infer<typeof schema>;

export default function RegisterDoctorPage() {
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

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: "DOCTOR",
          specialtyId: data.specialtyId,
          whatsapp: (data.whatsapp && data.whatsapp.replace(/\D/g, "").length >= 9) ? data.whatsapp : data.phone,
          password: data.password,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "حدث خطأ في التسجيل");
      } else {
        toast.success("تم إنشاء الحساب بنجاح! سجّل دخولك الآن.");
        router.push("/login/doctor");
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
        <CardTitle className="text-2xl">إنشاء حساب طبيب</CardTitle>
        <CardDescription className="text-base mt-1">انضم واستقبل المرضى</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="الاسم الكامل" placeholder="د. أحمد محمد" icon={<User className="h-4 w-4" />} error={errors.name?.message} {...register("name")} />
          <Input label="البريد الإلكتروني" type="email" placeholder="doctor@example.com" icon={<Mail className="h-4 w-4" />} error={errors.email?.message} {...register("email")} dir="ltr" />
          <Input label="رقم الهاتف" type="tel" placeholder="05991234567" icon={<Phone className="h-4 w-4" />} error={errors.phone?.message} {...register("phone")} dir="ltr" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">التخصص</label>
            <select className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" {...register("specialtyId")}>
              <option value="">اختر التخصص</option>
              {specialties.map((s) => <option key={s.id} value={s.id}>{s.nameAr}</option>)}
            </select>
            {errors.specialtyId && <p className="mt-1 text-xs text-red-500">{errors.specialtyId.message}</p>}
          </div>
          <Input label="رقم الواتساب (اختياري — يُستخدم رقم الهاتف إن تركته فارغاً)" type="tel" placeholder="05991234567" icon={<Phone className="h-4 w-4" />} error={errors.whatsapp?.message} {...register("whatsapp")} dir="ltr" />
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">كلمة المرور</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400"><Lock className="h-4 w-4" /></div>
              <input type={showPassword ? "text" : "password"} placeholder="••••••••" className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" autoComplete="new-password" {...register("password")} dir="ltr" />
              <button type="button" className="absolute inset-y-0 left-3 flex items-center text-gray-400 hover:text-gray-600" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>}
          </div>
          <Input label="تأكيد كلمة المرور" type="password" placeholder="••••••••" icon={<Lock className="h-4 w-4" />} error={errors.confirmPassword?.message} {...register("confirmPassword")} dir="ltr" />
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> جاري إنشاء الحساب...</> : "إنشاء الحساب"}
          </Button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-base text-gray-600">
            لديك حساب طبيب؟{" "}
            <Link href="/login/doctor" className="text-blue-600 font-semibold hover:underline">تسجيل الدخول</Link>
          </p>
          <p className="text-sm text-gray-500 mt-2">
            <Link href="/register" className="hover:underline">إنشاء حساب مريض</Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
