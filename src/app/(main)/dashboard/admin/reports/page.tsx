import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import IconTrendingUp from "@/components/icon/icon-trending-up";
import IconUsers from "@/components/icon/icon-users";
import IconCalendar from "@/components/icon/icon-calendar";
import IconDollarSign from "@/components/icon/icon-dollar-sign";
import IconHeart from "@/components/icon/icon-heart";
import IconArrowForward from "@/components/icon/icon-arrow-forward";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminReportsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PLATFORM_ADMIN") redirect("/");

  const [
    { count: doctorsCount },
    { count: usersCount },
    { count: appointmentsCount },
    { data: payments },
  ] = await Promise.all([
    supabaseAdmin.from("Doctor").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("User").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("Appointment").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("Payment").select("amount").eq("status", "PAID"),
  ]);

  const revenue = (payments ?? []).reduce((s: number, p: { amount?: number }) => s + (p.amount ?? 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">التقارير</h1>
          <p className="text-gray-500">نظرة عامة على المنصة</p>
        </div>
        <Link href="/dashboard/admin" className="text-blue-600 text-sm font-medium flex items-center gap-1">
          <IconArrowForward className="h-4 w-4" />
          لوحة التحكم
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600">
                <IconHeart className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{doctorsCount ?? 0}</p>
                <p className="text-xs text-gray-500">الأطباء</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-100 text-purple-600">
                <IconUsers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{usersCount ?? 0}</p>
                <p className="text-xs text-gray-500">المستخدمون</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600">
                <IconCalendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{appointmentsCount ?? 0}</p>
                <p className="text-xs text-gray-500">المواعيد</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-100 text-green-600">
                <IconDollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">₪{revenue.toFixed(0)}</p>
                <p className="text-xs text-gray-500">إجمالي الإيرادات</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconTrendingUp className="h-5 w-5" />
            ملخص المنصة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-sm">
            إحصائيات المنصة تُحدَّث حسب بيانات الأطباء والمستخدمين والمواعيد والمدفوعات. للتفاصيل استخدم صفحات الأطباء والمواعيد والمستخدمون.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
