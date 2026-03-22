import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Stethoscope,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import AdminDoctorActions from "./admin-doctor-actions";

function formatSubscriptionLabel(d: { medicalCenterId?: string | null; subscriptionPeriod?: string | null }) {
  if (d.medicalCenterId) return "ضمن اشتراك المركز (تلقائي)";
  if (d.subscriptionPeriod === "monthly") return "شهري ₪80";
  if (d.subscriptionPeriod === "half_year") return "نصف سنة ₪400";
  if (d.subscriptionPeriod === "yearly") return "سنة ₪800";
  return "لا يوجد";
}

export default async function AdminDashboard() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PLATFORM_ADMIN") redirect("/");

  const [
    { count: totalDoctors },
    { data: doctorsList },
    { data: subscriptionPayments },
  ] = await Promise.all([
    supabaseAdmin.from("Doctor").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("Doctor")
      .select(
        "id, userId, status, subscriptionPeriod, subscriptionEndDate, medicalCenterId, canAddExtraClinics, createdAt, user:User(name, email), specialty:Specialty(nameAr)"
      )
      .order("createdAt", { ascending: false }),
    supabaseAdmin.from("SubscriptionPayment").select("amount"),
  ]);

  const pendingDoctors = doctorsList?.filter((d) => d.status === "PENDING") ?? [];
  const revenue = subscriptionPayments?.reduce((s, p) => s + (p.amount ?? 0), 0) ?? 0;
  const doctorsForTable = ((doctorsList ?? []) as {
    id: string;
    user?: { name?: string; email?: string };
    specialty?: { nameAr?: string };
    status?: string;
    subscriptionPlan?: string;
    subscriptionPeriod?: string;
    subscriptionEndDate?: string;
    medicalCenterId?: string | null;
    canAddExtraClinics?: boolean;
    createdAt?: string;
  }[]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">لوحة تحكم المشرف</h1>
        <p className="text-gray-500 mt-1">إدارة المنصة الطبية</p>
      </div>

      {/* إحصائيات — إيرادات من الاشتراكات فقط */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          { label: "إجمالي الأطباء", value: totalDoctors ?? 0, icon: Users, color: "text-blue-600 bg-blue-50" },
          { label: "بانتظار الموافقة", value: pendingDoctors.length, icon: AlertCircle, color: "text-orange-600 bg-orange-50" },
          { label: "إجمالي الإيرادات (اشتراكات)", value: `₪${revenue.toFixed(0)}`, icon: TrendingUp, color: "text-green-600 bg-green-50" },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className={`inline-flex p-2.5 rounded-xl ${stat.color} mb-3`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* جدول الأطباء مع الاشتراكات */}
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-base sm:text-lg">
            <span className="inline-flex items-center gap-2 text-gray-900">
              <Stethoscope className="h-5 w-5 text-blue-600" />
              <span>الأطباء والاشتراكات</span>
            </span>
            <span className="text-xs text-gray-400 hidden sm:inline">
              عرض سريع لحالة الأطباء وخطط الاشتراك
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {/* عرض موبايل كبطاقات */}
          <div className="space-y-3 sm:hidden">
            {doctorsForTable.map((d) => (
              <div
                key={d.id}
                className="rounded-xl border bg-white p-3 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/dashboard/admin/doctors/${d.id}`} className="min-w-0 flex-1 hover:opacity-90">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      د. {d.user?.name ?? "—"}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {d.user?.email}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {d.specialty?.nameAr ?? "—"}
                    </p>
                    <span className="text-xs text-blue-600 mt-1 inline-block">عرض التفاصيل ←</span>
                  </Link>
                  <Badge
                    variant={
                      d.status === "APPROVED"
                        ? "success"
                        : d.status === "PENDING"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {d.status === "APPROVED"
                      ? "موافق"
                      : d.status === "PENDING"
                      ? "قيد المراجعة"
                      : d.status === "REJECTED"
                      ? "مرفوض"
                      : "موقوف"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                  <span>الاشتراك: {formatSubscriptionLabel(d)}</span>
                  <span className="whitespace-nowrap">
                    {d.createdAt ? format(new Date(d.createdAt), "dd/MM/yyyy") : "—"}
                  </span>
                </div>
                {d.subscriptionEndDate && (
                  <p className="text-[11px] text-gray-400">
                    ينتهي في {format(new Date(d.subscriptionEndDate), "dd/MM/yyyy")}
                  </p>
                )}
                <div className="mt-2">
                  <AdminDoctorActions
                    doctorId={d.id}
                    subscriptionPeriod={d.subscriptionPeriod}
                    status={d.status}
                    isPending={d.status === "PENDING"}
                    showSubscription={d.status === "APPROVED"}
                    medicalCenterId={d.medicalCenterId}
                    canAddExtraClinics={Boolean(d.canAddExtraClinics)}
                  />
                </div>
              </div>
            ))}
            {doctorsForTable.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                لا يوجد أطباء مسجلون بعد
              </div>
            )}
          </div>

          {/* جدول سطح المكتب */}
          <div className="hidden sm:block overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 touch-pan-x scrollbar-hide">
            <table className="w-full text-right min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs sm:text-sm text-gray-500 bg-gray-50/60">
                  <th className="py-2.5 pr-3 font-medium">الطبيب</th>
                  <th className="py-2.5 font-medium">التخصص</th>
                  <th className="py-2.5 font-medium">الحالة</th>
                  <th className="py-2.5 font-medium">الاشتراك</th>
                  <th className="py-2.5 font-medium">تاريخ التسجيل</th>
                  <th className="py-2.5 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {doctorsForTable.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 pr-3 align-top">
                      <Link href={`/dashboard/admin/doctors/${d.id}`} className="block hover:opacity-90">
                        <p className="font-medium text-gray-900">{d.user?.name ?? "—"}</p>
                        <p className="text-xs text-gray-500">{d.user?.email}</p>
                        <span className="text-xs text-blue-600">عرض التفاصيل</span>
                      </Link>
                    </td>
                    <td className="py-3 align-top text-sm text-gray-700">
                      {d.specialty?.nameAr ?? "—"}
                    </td>
                    <td className="py-3 align-top">
                      <Badge
                        variant={
                          d.status === "APPROVED"
                            ? "success"
                            : d.status === "PENDING"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {d.status === "APPROVED"
                          ? "موافق"
                          : d.status === "PENDING"
                          ? "قيد المراجعة"
                          : d.status === "REJECTED"
                          ? "مرفوض"
                          : "موقوف"}
                      </Badge>
                    </td>
                    <td className="py-3 align-top">
                      {d.medicalCenterId ? (
                        <div className="flex flex-col gap-0.5 text-xs sm:text-sm">
                          <span className="inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 bg-sky-50 text-sky-800 border border-sky-100">
                            {formatSubscriptionLabel(d)}
                          </span>
                          {d.subscriptionEndDate && (
                            <span className="text-[11px] text-gray-400">
                              ينتهي في {format(new Date(d.subscriptionEndDate), "dd/MM/yyyy")}
                            </span>
                          )}
                        </div>
                      ) : d.subscriptionPeriod ? (
                        <div className="flex flex-col gap-0.5 text-xs sm:text-sm">
                          <span
                            className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 ${
                              d.subscriptionPeriod === "monthly"
                                ? "bg-blue-50 text-blue-700"
                                : d.subscriptionPeriod === "half_year"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {d.subscriptionPeriod === "monthly"
                              ? "شهري ₪80"
                              : d.subscriptionPeriod === "half_year"
                                ? "نصف سنة ₪400"
                                : d.subscriptionPeriod === "yearly"
                                  ? "سنة ₪800"
                                  : "—"}
                          </span>
                          {d.subscriptionEndDate && (
                            <span className="text-[11px] text-gray-400">
                              ينتهي في {format(new Date(d.subscriptionEndDate), "dd/MM/yyyy")}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">لا يوجد اشتراك</span>
                      )}
                    </td>
                    <td className="py-3 align-top text-xs text-gray-500 whitespace-nowrap">
                      {d.createdAt ? format(new Date(d.createdAt), "dd/MM/yyyy") : "—"}
                    </td>
                    <td className="py-3 align-top">
                      <AdminDoctorActions
                        doctorId={d.id}
                        subscriptionPeriod={d.subscriptionPeriod}
                        status={d.status}
                        isPending={d.status === "PENDING"}
                        showSubscription={d.status === "APPROVED"}
                        medicalCenterId={d.medicalCenterId}
                        canAddExtraClinics={Boolean(d.canAddExtraClinics)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {doctorsForTable.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-2" />
                <p>لا يوجد أطباء مسجلون بعد</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* أطباء بانتظار الموافقة */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              بانتظار الموافقة ({pendingDoctors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {pendingDoctors.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-400" />
                <p className="text-sm">لا يوجد طلبات معلقة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(pendingDoctors as { id: string; user?: { name?: string }; specialty?: { nameAr?: string }; createdAt?: string; subscriptionPlan?: string; subscriptionPeriod?: string | null; medicalCenterId?: string | null; canAddExtraClinics?: boolean }[]).map((doctor) => (
                  <div
                    key={doctor.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-600 shrink-0">
                      {doctor.user?.name?.charAt(0) || "D"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        د. {doctor.user?.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {doctor.specialty?.nameAr} •{" "}
                        {doctor.createdAt ? format(new Date(doctor.createdAt), "dd/MM/yyyy") : ""}
                      </p>
                    </div>
                    <AdminDoctorActions
                      doctorId={doctor.id}
                      subscriptionPeriod={doctor.subscriptionPeriod}
                      status="PENDING"
                      isPending
                      showSubscription={false}
                      medicalCenterId={doctor.medicalCenterId}
                      canAddExtraClinics={Boolean(doctor.canAddExtraClinics)}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
