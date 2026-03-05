import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import Link from "next/link";
import {
  Users, Calendar, TrendingUp, Star,
  CheckCircle, ChevronLeft, Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DoctorActions from "./doctor-actions";

export default async function DoctorHomePage() {
  const session = await auth();
  if (!session || session.user.role !== "DOCTOR") redirect("/login");

  const doctor = await prisma.doctor.findUnique({
    where: { userId: session.user.id },
    include: { specialty: true },
  });
  if (!doctor) redirect("/login");

  if (doctor.status === "PENDING") {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⏳</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">حسابك قيد المراجعة</h1>
          <p className="text-gray-500">سيتم مراجعة طلبك خلال 24-48 ساعة.</p>
        </div>
      </div>
    );
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  const [todayApts, stats, totalPatients, earnings] = await Promise.all([
    prisma.clinicAppointment.findMany({
      where: { doctorId: doctor.id, date: { gte: today, lt: tomorrow } },
      include: { clinicPatient: true },
      orderBy: { time: "asc" },
    }),
    prisma.clinicAppointment.groupBy({
      by: ["status"], where: { doctorId: doctor.id }, _count: true,
    }),
    prisma.clinicPatient.count({ where: { doctorId: doctor.id, isActive: true } }),
    prisma.clinicTransaction.aggregate({
      where: { clinicPatient: { doctorId: doctor.id }, type: "PAYMENT" },
      _sum: { amount: true },
    }),
  ]);

  type StatItem = (typeof stats)[number];
  type TodayAptItem = (typeof todayApts)[number];
  const statsMap = Object.fromEntries(stats.map((s: StatItem) => [s.status, s._count]));
  const upcomingToday = todayApts.filter((a: TodayAptItem) => a.status === "SCHEDULED");

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            أهلاً، د. {session.user.name} 👨‍⚕️
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {doctor.specialty.nameAr} • {format(new Date(), "EEEE، d MMMM yyyy")}
          </p>
        </div>
        <Link href="/dashboard/doctor/patients/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> مريض جديد
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "إجمالي المرضى", value: totalPatients, icon: Users, color: "bg-blue-50 text-blue-600", border: "border-blue-100" },
          { label: "مواعيد اليوم", value: upcomingToday.length, icon: Calendar, color: "bg-indigo-50 text-indigo-600", border: "border-indigo-100" },
          { label: "مواعيد منجزة", value: statsMap["COMPLETED"] || 0, icon: CheckCircle, color: "bg-green-50 text-green-600", border: "border-green-100" },
          { label: "إجمالي الإيرادات", value: `₪${(earnings._sum.amount || 0).toFixed(0)}`, icon: TrendingUp, color: "bg-emerald-50 text-emerald-600", border: "border-emerald-100" },
        ].map((s, i) => (
          <Card key={i} className={`border ${s.border}`}>
            <CardContent className="p-5">
              <div className={`inline-flex p-2.5 rounded-xl ${s.color} mb-3`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">
                جدول اليوم
              </CardTitle>
              <Link href="/dashboard/doctor/appointments">
                <Button variant="ghost" size="sm" className="text-blue-600 gap-1 text-xs">
                  عرض الكل <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {todayApts.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Calendar className="h-10 w-10 mx-auto mb-2 text-gray-200" />
                  <p className="text-sm">لا توجد مواعيد اليوم</p>
                  <Link href="/dashboard/doctor/appointments/new">
                    <Button size="sm" variant="outline" className="mt-3 gap-1">
                      <Plus className="h-3.5 w-3.5" /> إضافة موعد
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {todayApts.map((apt: TodayAptItem) => (
                    <div key={apt.id}
                      className={`flex items-center gap-4 p-3.5 rounded-xl border transition-colors ${
                        apt.status === "COMPLETED" ? "bg-green-50 border-green-100"
                        : apt.status === "CANCELLED" ? "bg-red-50 border-red-100 opacity-60"
                        : "bg-white border-gray-100 hover:border-blue-200"
                      }`}
                    >
                      <div className="w-14 text-center shrink-0">
                        <div className="text-sm font-bold text-gray-900">{apt.time}</div>
                        <div className="text-xs text-gray-400">{apt.duration} د</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {apt.clinicPatient.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{apt.title}</p>
                      </div>
                      {apt.status === "SCHEDULED" && (
                        <DoctorActions appointmentId={apt.id} type="clinic" />
                      )}
                      {apt.status === "COMPLETED" && (
                        <Badge variant="success" className="text-xs">منجز</Badge>
                      )}
                      {apt.status === "CANCELLED" && (
                        <Badge variant="destructive" className="text-xs">ملغي</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">إحصائيات المواعيد</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {[
                { label: "مجدولة", count: statsMap["SCHEDULED"] || 0, color: "bg-blue-500" },
                { label: "منجزة", count: statsMap["COMPLETED"] || 0, color: "bg-green-500" },
                { label: "ملغاة", count: statsMap["CANCELLED"] || 0, color: "bg-red-400" },
                { label: "غياب", count: statsMap["NO_SHOW"] || 0, color: "bg-yellow-500" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color} shrink-0`} />
                  <span className="text-sm text-gray-600 flex-1">{item.label}</span>
                  <span className="text-sm font-bold text-gray-900">{item.count}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-blue-600 border-blue-600">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <Star className="h-5 w-5 text-yellow-300" />
                <span className="text-white font-semibold text-sm">تقييمك</span>
              </div>
              <div className="text-3xl font-bold text-white">{doctor.rating.toFixed(1)}</div>
              <div className="text-blue-200 text-xs mt-0.5">{doctor.totalReviews} تقييم</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
