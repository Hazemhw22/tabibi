import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import IconCreditCard from "@/components/icon/icon-credit-card";
import IconTrendingUp from "@/components/icon/icon-trending-up";
import IconUsers from "@/components/icon/icon-users";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

const PLAN_LABELS: Record<string, string> = {
  monthly: "شهري ₪80",
  half_year: "نصف سنة ₪400",
  yearly: "سنة ₪800",
};

function subscriptionStatusLabel(d: {
  medicalCenterId?: string | null;
  subscriptionPeriod?: string | null;
  subscriptionEndDate?: string | null;
}): string {
  if (d.medicalCenterId) return "ضمن اشتراك المركز";
  if (d.subscriptionPeriod === "monthly") return PLAN_LABELS.monthly;
  if (d.subscriptionPeriod === "half_year") return PLAN_LABELS.half_year;
  if (d.subscriptionPeriod === "yearly") return PLAN_LABELS.yearly;
  return "—";
}

export default async function AdminSubscriptionsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PLATFORM_ADMIN") redirect("/");

  const [{ data: amountRows }, { data: payments }, { data: doctors }] = await Promise.all([
    supabaseAdmin.from("SubscriptionPayment").select("amount"),
    supabaseAdmin
      .from("SubscriptionPayment")
      .select(`
      id, amount, period, createdAt,
      doctor:Doctor(id, user:User!Doctor_userId_fkey(name), specialty:Specialty(nameAr))
    `)
      .order("createdAt", { ascending: false })
      .limit(500),
    supabaseAdmin
      .from("Doctor")
      .select(
        `id, status, subscriptionPeriod, subscriptionEndDate, medicalCenterId, subscriptionPlan, createdAt,
         user:User!Doctor_userId_fkey(name, email),
         specialty:Specialty(nameAr)`
      )
      .order("createdAt", { ascending: false }),
  ]);

  const totalRevenue = (amountRows ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);

  const doctorsList = (doctors ?? []) as Array<{
    id: string;
    status: string;
    subscriptionPeriod?: string | null;
    subscriptionEndDate?: string | null;
    medicalCenterId?: string | null;
    subscriptionPlan?: string | null;
    user?: { name?: string; email?: string } | { name?: string; email?: string }[];
    specialty?: { nameAr?: string } | { nameAr?: string }[];
  }>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">الاشتراكات</h1>
        <p className="text-gray-500 mt-1">إيرادات اشتراكات الأطباء وحالة الاشتراك لكل طبيب</p>
      </div>

      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-100">
                <IconTrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">إجمالي إيرادات الاشتراكات (كل العمليات المسجّلة)</p>
                <p className="text-3xl font-bold text-gray-900">₪{totalRevenue.toFixed(0)}</p>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              <p>
                {doctorsList.length} طبيباً في المنصة · {amountRows?.length ?? 0} عملية دفع في السجل
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* كل الأطباء — حالة الاشتراك من جدول Doctor (وليس من سجل المدفوعات فقط) */}
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base sm:text-lg">
            <span className="inline-flex items-center gap-2 text-gray-900">
              <IconUsers className="h-5 w-5 text-blue-600" />
              <span>جميع الأطباء وحالة الاشتراك</span>
            </span>
            <span className="text-xs text-gray-400 hidden sm:inline">
              يشمل من ليس لديهم سطر في سجل المدفوعات (مثلاً ضمن مركز طبي)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 touch-pan-x scrollbar-hide">
          <table className="w-full text-right min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs sm:text-sm text-gray-500 bg-gray-50/60">
                <th className="py-2.5 pr-3 font-medium">الطبيب</th>
                <th className="py-2.5 font-medium">التخصص</th>
                <th className="py-2.5 font-medium">الحالة</th>
                <th className="py-2.5 font-medium">الخطة / الاشتراك</th>
                <th className="py-2.5 pl-3 font-medium">ينتهي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {doctorsList.map((d) => {
                const u = Array.isArray(d.user) ? d.user[0] : d.user;
                const sp = Array.isArray(d.specialty) ? d.specialty[0] : d.specialty;
                const end = d.subscriptionEndDate ? new Date(d.subscriptionEndDate) : null;
                return (
                  <tr key={d.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 pr-3 align-top">
                      <p className="font-medium text-gray-900">د. {u?.name ?? "—"}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[200px]">{u?.email ?? ""}</p>
                    </td>
                    <td className="py-3 align-top text-gray-600">{sp?.nameAr ?? "—"}</td>
                    <td className="py-3 align-top">
                      <Badge
                        variant="outline"
                        className={
                          d.status === "APPROVED"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : d.status === "PENDING"
                              ? "border-amber-200 bg-amber-50 text-amber-900"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                        }
                      >
                        {d.status === "APPROVED"
                          ? "معتمد"
                          : d.status === "PENDING"
                            ? "معلق"
                            : d.status === "REJECTED"
                              ? "مرفوض"
                              : d.status}
                      </Badge>
                    </td>
                    <td className="py-3 align-top text-gray-800">
                      {subscriptionStatusLabel(d)}
                      {d.subscriptionPlan ? (
                        <span className="text-xs text-gray-500 block">{d.subscriptionPlan}</span>
                      ) : null}
                    </td>
                    <td className="py-3 pl-3 align-top text-gray-600 whitespace-nowrap">
                      {end && !Number.isNaN(end.getTime())
                        ? format(end, "d MMM yyyy", { locale: ar })
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {doctorsList.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">لا يوجد أطباء</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-base sm:text-lg">
            <span className="inline-flex items-center gap-2 text-gray-900">
              <IconCreditCard className="h-5 w-5 text-blue-600" />
              <span>سجل مدفوعات الاشتراك</span>
            </span>
            <span className="text-xs text-gray-400 hidden sm:inline">
              آخر {payments?.length ?? 0} عملية (حد أقصى 500) — كل سطر = دفعة مسجّلة في النظام
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
              <IconCreditCard className="h-12 w-12 mx-auto mb-2" />
              <p>لا توجد مدفوعات اشتراك مسجّلة في السجل</p>
              <p className="text-xs mt-2 max-w-md mx-auto">
                الطبيب المرتبط بمركز طبي قد لا يظهر هنا إذا لم تُسجَّل له دفعة منفصلة؛ راجع جدول «جميع
                الأطباء» أعلاه.
              </p>
              <Link
                href="/dashboard/admin/doctors"
                className="text-blue-600 text-sm mt-2 inline-block "
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
