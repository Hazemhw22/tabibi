import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { format } from "date-fns";
import { CreditCard, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const PLAN_LABELS: Record<string, string> = {
  monthly: "شهري ₪80",
  half_year: "نصف سنة ₪400",
  yearly: "سنة ₪800",
};

export default async function AdminSubscriptionsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PLATFORM_ADMIN") redirect("/");

  const { data: payments } = await supabaseAdmin
    .from("SubscriptionPayment")
    .select(`
      id, amount, period, createdAt,
      doctor:Doctor(id, user:User(name), specialty:Specialty(nameAr))
    `)
    .order("createdAt", { ascending: false })
    .limit(50);

  const totalRevenue = (payments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">الاشتراكات</h1>
        <p className="text-gray-500 mt-1">إيرادات اشتراكات الأطباء</p>
      </div>

      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-100">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">إجمالي إيرادات الاشتراكات</p>
                <p className="text-3xl font-bold text-gray-900">
                  ₪{totalRevenue.toFixed(0)}
                </p>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              <p>يشمل آخر {payments?.length ?? 0} عملية اشتراك مسجلة</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-base sm:text-lg">
            <span className="inline-flex items-center gap-2 text-gray-900">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <span>سجل الاشتراكات</span>
            </span>
            <span className="text-xs text-gray-400 hidden sm:inline">
              أحدث عمليات دفع اشتراك من الأطباء
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 touch-pan-x scrollbar-hide">
          <table className="w-full text-right min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs sm:text-sm text-gray-500 bg-gray-50/60">
                <th className="py-2.5 pr-3 font-medium">التاريخ</th>
                <th className="py-2.5 font-medium">الطبيب</th>
                <th className="py-2.5 font-medium">الخطة</th>
                <th className="py-2.5 font-medium">المبلغ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {((payments ?? []) as {
                id: string;
                amount: number;
                period: string;
                createdAt: string;
                doctor?: { user?: { name?: string }; specialty?: { nameAr?: string } };
              }[]).map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-3 pr-3 text-xs sm:text-sm text-gray-700 whitespace-nowrap align-top">
                    {format(new Date(p.createdAt), "dd/MM/yyyy HH:mm")}
                  </td>
                  <td className="py-3 align-top">
                    <p className="font-medium text-gray-900">
                      د. {(p.doctor?.user as { name?: string })?.name ?? "—"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(p.doctor?.specialty as { nameAr?: string })?.nameAr ?? ""}
                    </p>
                  </td>
                  <td className="py-3 align-top">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                      {PLAN_LABELS[p.period] ?? p.period}
                    </span>
                  </td>
                  <td className="py-3 align-top font-semibold text-green-600 whitespace-nowrap">
                    ₪{p.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!payments || payments.length === 0) && (
            <div className="text-center py-12 text-gray-400">
              <CreditCard className="h-12 w-12 mx-auto mb-2" />
              <p>لا توجد اشتراكات مسجلة</p>
              <Link
                href="/dashboard/admin/doctors"
                className="text-blue-600 text-sm mt-2 inline-block hover:underline"
              >
                إدارة الأطباء
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
