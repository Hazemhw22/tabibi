import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { User, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const dashboardUrl =
    session.user.role === "DOCTOR"
      ? "/dashboard/doctor"
      : session.user.role === "PLATFORM_ADMIN" || session.user.role === "CLINIC_ADMIN"
        ? "/dashboard/admin"
        : "/dashboard/patient";

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">الملف الشخصي</h1>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
              {(session.user.name ?? "U").charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-lg">{session.user.name ?? "—"}</p>
              <p className="text-gray-500 text-sm">{session.user.email}</p>
            </div>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p><span className="font-medium">الدور:</span> {session.user.role === "DOCTOR" ? "طبيب" : session.user.role === "PLATFORM_ADMIN" ? "مشرف منصة" : session.user.role === "CLINIC_ADMIN" ? "مشرف عيادة" : "مريض"}</p>
          </div>
          <Link href={dashboardUrl} className="inline-flex items-center gap-2 mt-6 text-blue-600 font-medium text-sm">
            <ArrowRight className="h-4 w-4" />
            الذهاب للوحة التحكم
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
