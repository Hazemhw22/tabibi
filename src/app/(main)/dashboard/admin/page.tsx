import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  Users,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Stethoscope,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import AdminDoctorActions from "./admin-doctor-actions";

export default async function AdminDashboard() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PLATFORM_ADMIN") redirect("/");

  const [
    { count: totalDoctors },
    { data: doctorsList },
    { count: totalAppointments },
    { data: payments },
    { data: recentAppointments },
  ] = await Promise.all([
    supabaseAdmin.from("Doctor").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("Doctor")
      .select("id, userId, status, subscriptionPlan, createdAt, user:User(name, email), specialty:Specialty(nameAr)")
      .order("createdAt", { ascending: false }),
    supabaseAdmin.from("Appointment").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("Payment").select("amount").eq("status", "PAID"),
    supabaseAdmin
      .from("Appointment")
      .select("id, appointmentDate, status, patient:User(name), doctor:Doctor(user:User(name), specialty:Specialty(nameAr))")
      .order("createdAt", { ascending: false })
      .limit(10),
  ]);

  const pendingDoctors = doctorsList?.filter((d) => d.status === "PENDING") ?? [];
  const revenue = payments?.reduce((s, p) => s + (p.amount ?? 0), 0) ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">لوحة تحكم المشرف</h1>
        <p className="text-gray-500 mt-1">إدارة المنصة الطبية</p>
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "إجمالي الأطباء", value: totalDoctors ?? 0, icon: Users, color: "text-blue-600 bg-blue-50" },
          { label: "بانتظار الموافقة", value: pendingDoctors.length, icon: AlertCircle, color: "text-orange-600 bg-orange-50" },
          { label: "إجمالي المواعيد", value: totalAppointments ?? 0, icon: Calendar, color: "text-purple-600 bg-purple-50" },
          { label: "إجمالي الإيرادات", value: `₪${revenue.toFixed(0)}`, icon: TrendingUp, color: "text-green-600 bg-green-50" },
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            الأطباء والاشتراكات
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto">
          <table className="w-full text-right min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-200 text-sm text-gray-500">
                <th className="pb-3 font-medium">الطبيب</th>
                <th className="pb-3 font-medium">التخصص</th>
                <th className="pb-3 font-medium">الحالة</th>
                <th className="pb-3 font-medium">الاشتراك</th>
                <th className="pb-3 font-medium">التاريخ</th>
                <th className="pb-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {((doctorsList ?? []) as { id: string; user?: { name?: string; email?: string }; specialty?: { nameAr?: string }; status?: string; subscriptionPlan?: string; createdAt?: string }[]).map((d) => (
                <tr key={d.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-3">
                    <p className="font-medium text-gray-900">{d.user?.name ?? "—"}</p>
                    <p className="text-xs text-gray-500">{d.user?.email}</p>
                  </td>
                  <td className="py-3 text-sm text-gray-700">{d.specialty?.nameAr ?? "—"}</td>
                  <td className="py-3">
                    <Badge
                      variant={
                        d.status === "APPROVED" ? "success" : d.status === "PENDING" ? "secondary" : "destructive"
                      }
                    >
                      {d.status === "APPROVED" ? "موافق" : d.status === "PENDING" ? "قيد المراجعة" : d.status === "REJECTED" ? "مرفوض" : "موقوف"}
                    </Badge>
                  </td>
                  <td className="py-3">
                    <span className="text-sm text-gray-700">
                      {d.subscriptionPlan === "premium" ? "بريميوم" : d.subscriptionPlan === "enterprise" ? "مؤسسة" : "أساسي"}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-gray-500">
                    {d.createdAt ? format(new Date(d.createdAt), "dd/MM/yyyy") : "—"}
                  </td>
                  <td className="py-3">
                    {d.status === "PENDING" && <AdminDoctorActions doctorId={d.id} subscriptionPlan={d.subscriptionPlan} />}
                    {d.status === "APPROVED" && (
                      <AdminDoctorActions doctorId={d.id} subscriptionPlan={d.subscriptionPlan} showSubscription />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!doctorsList || doctorsList.length === 0) && (
            <div className="text-center py-12 text-gray-400">
              <Users className="h-12 w-12 mx-auto mb-2" />
              <p>لا يوجد أطباء مسجلون بعد</p>
            </div>
          )}
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
                {(pendingDoctors as { id: string; user?: { name?: string }; specialty?: { nameAr?: string }; createdAt?: string; subscriptionPlan?: string }[]).map((doctor) => (
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
                    <AdminDoctorActions doctorId={doctor.id} subscriptionPlan={doctor.subscriptionPlan} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* آخر المواعيد */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">آخر المواعيد</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {((recentAppointments ?? []) as { id: string; appointmentDate?: string; status?: string; patient?: { name?: string }; doctor?: { user?: { name?: string }; specialty?: { nameAr?: string } } }[]).map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {apt.patient?.name ?? "—"}
                    </p>
                    <p className="text-xs text-gray-500">
                      د. {apt.doctor?.user?.name} • {apt.doctor?.specialty?.nameAr}
                    </p>
                  </div>
                  <div className="text-left mr-3">
                    <p className="text-xs text-gray-500">
                      {apt.appointmentDate ? format(new Date(apt.appointmentDate), "dd/MM") : "—"}
                    </p>
                    <Badge
                      variant={
                        apt.status === "CONFIRMED" ? "default" : apt.status === "COMPLETED" ? "success" : apt.status === "CANCELLED" ? "destructive" : "secondary"
                      }
                      className="text-xs mt-0.5"
                    >
                      {apt.status === "CONFIRMED" ? "مؤكد" : apt.status === "COMPLETED" ? "منجز" : apt.status === "CANCELLED" ? "ملغي" : apt.status === "DRAFT" ? "مسودة" : "غياب"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            {(!recentAppointments || recentAppointments.length === 0) && (
              <div className="text-center py-8 text-gray-400 text-sm">لا توجد مواعيد</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
