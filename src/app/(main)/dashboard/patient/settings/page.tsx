import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings, ArrowRight, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PatientSettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PATIENT") redirect("/");

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الإعدادات</h1>
          <p className="text-gray-500">إعدادات حسابك كـ مريض</p>
        </div>
        <Link href="/dashboard/patient" className="text-blue-600 text-sm font-medium flex items-center gap-1">
          <ArrowRight className="h-4 w-4" />
          لوحة التحكم
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            بيانات الحساب
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-gray-600"><span className="font-medium">الاسم:</span> {session.user.name ?? "—"}</p>
          <p className="text-sm text-gray-600"><span className="font-medium">البريد:</span> {session.user.email}</p>
          <p className="text-sm text-gray-600"><span className="font-medium">الدور:</span> مريض</p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            الإعدادات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            لتغيير كلمة المرور أو بيانات الاتصال يمكن إضافة نموذج تحديث الملف الشخصي لاحقاً أو استخدام صفحة الملف الشخصي من القائمة.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
