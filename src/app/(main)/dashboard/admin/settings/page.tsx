import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings, ArrowRight, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PLATFORM_ADMIN") redirect("/");

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إعدادات المشرف</h1>
          <p className="text-gray-500">إعدادات لوحة تحكم المنصة</p>
        </div>
        <Link href="/dashboard/admin" className="text-blue-600 text-sm font-medium flex items-center gap-1">
          <ArrowRight className="h-4 w-4" />
          لوحة التحكم
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            حسابك
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-gray-600"><span className="font-medium">الاسم:</span> {session.user.name ?? "—"}</p>
          <p className="text-sm text-gray-600"><span className="font-medium">البريد:</span> {session.user.email}</p>
          <p className="text-sm text-gray-600"><span className="font-medium">الدور:</span> مشرف المنصة (PLATFORM_ADMIN)</p>
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
            إعدادات إضافية للمنصة (مثل البريد، الدفع، القيم الافتراضية) يمكن إضافتها لاحقاً عبر متغيرات البيئة أو لوحة إدارة.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
