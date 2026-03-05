import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import Link from "next/link";
import {
  Calendar,
  CheckCircle,
  TrendingUp,
  Star,
  AlertTriangle,
  Plus,
  Receipt,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DoctorActions from "./doctor-actions";

export default async function DoctorDashboard() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "DOCTOR") redirect("/");

  const { data: doctor } = await supabaseAdmin
    .from("Doctor")
    .select(`*, specialty:Specialty(*), clinics:Clinic(*), timeSlots:TimeSlot(*)`)
    .eq("userId", session.user.id)
    .single();

  if (!doctor) redirect("/dashboard/doctor/setup");

  if (doctor.status === "PENDING") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-6">⏳</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          حسابك قيد المراجعة
        </h1>
        <p className="text-gray-500 leading-relaxed">
          شكراً لتسجيلك في منصة Tabibi. سيتم مراجعة طلبك من قِبل فريقنا
          وإشعارك بالقبول قريباً.
        </p>
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl inline-flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <p className="text-sm text-yellow-800 font-medium">
            مدة المراجعة: 24-48 ساعة عمل
          </p>
        </div>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: clinicPatients } = await supabaseAdmin
    .from("ClinicPatient")
    .select("id")
    .eq("doctorId", doctor.id);
  const cpIds = (clinicPatients ?? []).map((p: { id: string }) => p.id);

  const [
    { data: todayAppointments },
    { data: allAppointments },
    { data: payments },
    { data: clinicTx },
    { data: platformTx },
    clinicTxListRes,
    platformTxListRes,
  ] = await Promise.all([
    supabaseAdmin
      .from("Appointment")
      .select(`*, patient:User(name, phone, email), clinic:Clinic(*)`)
      .eq("doctorId", doctor.id)
      .gte("appointmentDate", today.toISOString())
      .lt("appointmentDate", tomorrow.toISOString())
      .order("startTime"),

    supabaseAdmin
      .from("Appointment")
      .select("status")
      .eq("doctorId", doctor.id),

    supabaseAdmin
      .from("Payment")
      .select(`amount, appointment:Appointment!inner(doctorId)`)
      .eq("status", "PAID")
      .eq("appointment.doctorId", doctor.id),

    cpIds.length > 0
      ? supabaseAdmin
          .from("ClinicTransaction")
          .select("type, amount")
          .in("clinicPatientId", cpIds)
      : Promise.resolve({ data: [] as { type: string; amount: number }[] }),

    supabaseAdmin.from("PlatformPatientTransaction").select("type, amount").eq("doctorId", doctor.id),

    cpIds.length > 0
      ? supabaseAdmin
          .from("ClinicTransaction")
          .select("id, type, description, amount, date, clinicPatient:ClinicPatient(name)")
          .in("clinicPatientId", cpIds)
          .order("date", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),

    supabaseAdmin
      .from("PlatformPatientTransaction")
      .select("id, type, description, amount, date, patient:User(name)")
      .eq("doctorId", doctor.id)
      .order("date", { ascending: false })
      .limit(5),
  ]);

  const clinicTxData = (clinicTx ?? []) as { type: string; amount: number }[];
  const clinicPayments = clinicTxData.reduce(
    (s: number, t) => (t.type === "PAYMENT" ? s + t.amount : s),
    0
  );
  const totalServices =
    clinicTxData.reduce((s: number, t) => (t.type === "SERVICE" ? s + t.amount : s), 0) +
    (platformTx ?? []).reduce((s: number, t: { type: string; amount: number }) => (t.type === "SERVICE" ? s + t.amount : s), 0);
  const platformPayments = (platformTx ?? []).reduce(
    (s: number, t: { type: string; amount: number }) => (t.type === "PAYMENT" ? s + t.amount : s),
    0
  );
  const totalPaymentsAdded = clinicPayments + platformPayments;
  const debtAfterDeduction = Math.max(0, totalServices - totalPaymentsAdded);

  type TxRow = { id: string; type: string; description: string; amount: number; date: string; patientName: string; source: string };
  const clinicTxList = (clinicTxListRes.data ?? []) as Array<{
    id: string;
    type: string;
    description: string;
    amount: number;
    date: string;
    clinicPatient?: { name?: string };
  }>;
  const platformTxList = (platformTxListRes.data ?? []) as Array<{
    id: string;
    type: string;
    description: string;
    amount: number;
    date: string;
    patient?: { name?: string };
  }>;
  const last5Tx: TxRow[] = [
    ...clinicTxList.map((t) => ({
      id: t.id,
      type: t.type,
      description: t.description,
      amount: t.amount,
      date: t.date,
      patientName: (t.clinicPatient as { name?: string })?.name ?? "—",
      source: "عيادة",
    })),
    ...platformTxList.map((t) => ({
      id: t.id,
      type: t.type,
      description: t.description,
      amount: t.amount,
      date: t.date,
      patientName: (t.patient as { name?: string })?.name ?? "—",
      source: "منصة",
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const statsMap = (allAppointments ?? []).reduce(
    (acc: Record<string, number>, apt: { status: string }) => {
      acc[apt.status] = (acc[apt.status] || 0) + 1;
      return acc;
    },
    {}
  );

  const totalEarnings = (payments ?? []).reduce(
    (sum: number, p: { amount: number }) => sum + p.amount,
    0
  );
  const totalEarningsWithPayments = totalEarnings + totalPaymentsAdded;
  const paymentCount = payments?.length ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            لوحة تحكم الطبيب 👨‍⚕️
          </h1>
          <p className="text-gray-500 mt-1">
            د. {session.user.name} - {doctor.specialty?.nameAr}
          </p>
        </div>
        <Link href="/dashboard/doctor/settings">
          <Button variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            إعداد الجدول
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "إجمالي الأرباح",
            value: `₪${totalEarningsWithPayments.toFixed(0)}`,
            icon: TrendingUp,
            color: "text-green-600 bg-green-50",
          },
          {
            label: "الديون بعد الخصم",
            value: `₪${debtAfterDeduction.toFixed(0)}`,
            icon: AlertTriangle,
            color: "text-amber-600 bg-amber-50",
          },
          {
            label: "مواعيد اليوم",
            value: todayAppointments?.length ?? 0,
            icon: Calendar,
            color: "text-blue-600 bg-blue-50",
          },
          {
            label: "التقييم",
            value: (doctor.rating ?? 0).toFixed(1),
            icon: Star,
            color: "text-yellow-600 bg-yellow-50",
          },
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Today's Schedule */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                جدول اليوم ({format(today, "dd/MM/yyyy")})
              </CardTitle>
              <Badge variant="default">{todayAppointments?.length ?? 0} موعد</Badge>
            </CardHeader>
            <CardContent className="pt-0">
              {!todayAppointments?.length ? (
                <div className="text-center py-10 text-gray-500">
                  <Calendar className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p>لا توجد مواعيد اليوم</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayAppointments.map((apt: any) => (
                    <div
                      key={apt.id}
                      className={`flex flex-wrap items-center gap-4 p-4 rounded-xl border transition-colors ${
                        apt.status === "COMPLETED"
                          ? "bg-green-50 border-green-100"
                          : apt.status === "NO_SHOW"
                            ? "bg-red-50 border-red-100"
                            : apt.status === "DRAFT"
                              ? "bg-amber-50 border-amber-100"
                              : "bg-gray-50 border-gray-100 hover:bg-blue-50 hover:border-blue-100"
                      }`}
                    >
                      <div className="text-center min-w-[60px]">
                        <div className="text-sm font-bold text-gray-900">
                          {apt.startTime}
                        </div>
                        <div className="text-xs text-gray-500">{apt.endTime}</div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">
                          {apt.patient?.name ?? "—"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {apt.patient?.phone || apt.patient?.email || "—"}
                        </p>
                      </div>

                      <div className="text-left shrink-0">
                        <p className="text-sm font-bold text-green-600">
                          ₪{Number(apt.fee ?? 0)}
                        </p>
                        <p className="text-xs text-gray-500">سعر الحجز</p>
                      </div>

                      {apt.status === "CONFIRMED" && (
                        <DoctorActions appointmentId={apt.id} />
                      )}
                      {apt.status === "DRAFT" && (
                        <Badge variant="secondary">مسودة (بانتظار الدفع)</Badge>
                      )}
                      {apt.status === "COMPLETED" && (
                        <Badge variant="success">
                          <CheckCircle className="h-3 w-3 ml-1" />
                          منجز
                        </Badge>
                      )}
                      {apt.status === "NO_SHOW" && (
                        <Badge variant="destructive">غائب</Badge>
                      )}
                      {apt.status === "CANCELLED" && (
                        <Badge variant="destructive">ملغي</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-gray-700">إحصائيات المواعيد</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {[
                { label: "مؤكدة", count: statsMap["CONFIRMED"] || 0, color: "bg-blue-500" },
                { label: "منجزة", count: statsMap["COMPLETED"] || 0, color: "bg-green-500" },
                { label: "ملغاة", count: statsMap["CANCELLED"] || 0, color: "bg-red-400" },
                { label: "غياب",  count: statsMap["NO_SHOW"]   || 0, color: "bg-yellow-500" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color} shrink-0`} />
                  <span className="text-sm text-gray-600 flex-1">{item.label}</span>
                  <span className="text-sm font-bold text-gray-900">{item.count}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-xl border border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Receipt className="h-4 w-4 text-slate-600" />
                آخر 5 دفعات وديون
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {last5Tx.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">لا توجد معاملات حديثة</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-right border-b border-gray-100 text-gray-500">
                        <th className="py-2 px-1 font-medium">التاريخ</th>
                        <th className="py-2 px-1 font-medium">المريض</th>
                        <th className="py-2 px-1 font-medium">النوع</th>
                        <th className="py-2 px-1 font-medium">المبلغ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {last5Tx.map((row) => (
                        <tr key={`${row.source}-${row.id}`} className="text-right">
                          <td className="py-1.5 px-1 text-gray-600">
                            {format(new Date(row.date), "d/M", { locale: ar })}
                          </td>
                          <td className="py-1.5 px-1 font-medium text-gray-900 truncate max-w-[80px]" title={row.patientName}>
                            {row.patientName}
                          </td>
                          <td className="py-1.5 px-1">
                            <Badge variant={row.type === "PAYMENT" ? "default" : "secondary"} className="text-[10px] px-1 py-0">
                              {row.type === "PAYMENT" ? "دفعة" : "دين"}
                            </Badge>
                          </td>
                          <td className={`py-1.5 px-1 font-semibold ${row.type === "PAYMENT" ? "text-green-600" : "text-amber-600"}`}>
                            {row.type === "PAYMENT" ? "+" : "-"}₪{row.amount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Link href="/dashboard/doctor/reports" className="block text-center text-xs text-blue-600 hover:underline mt-2">
                عرض الكل في التقارير
              </Link>
            </CardContent>
          </Card>

          {doctor.clinics?.length === 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <h4 className="font-semibold text-orange-800 text-sm mb-1">
                  ⚠️ أضف عيادتك
                </h4>
                <p className="text-xs text-orange-700 mb-3">
                  لم تضف عيادة بعد. أضف عيادتك لاستقبال المرضى.
                </p>
                <Link href="/dashboard/doctor/settings">
                  <Button size="sm" className="w-full bg-orange-600 hover:bg-orange-700">
                    إضافة عيادة
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
