import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const dashboardUrl =
    session.user.role === "DOCTOR"
      ? "/dashboard/doctor/settings"
      : session.user.role === "PLATFORM_ADMIN" || session.user.role === "CLINIC_ADMIN"
        ? "/dashboard/admin/settings"
        : "/dashboard/patient/settings";

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">الإعدادات</h1>
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-600 mb-6">
            إعدادات حسابك مرتبطة بلوحة التحكم حسب دورك. انقر أدناه للانتقال إلى صفحة الإعدادات المناسبة.
          </p>
          <Link href={dashboardUrl} className="inline-flex items-center gap-2 text-blue-600 font-medium">
            <Settings className="h-4 w-4" />
            <ArrowRight className="h-4 w-4" />
            فتح إعدادات لوحة التحكم
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
