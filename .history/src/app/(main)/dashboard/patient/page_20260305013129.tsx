import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import Link from "next/link";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Star,
  Plus,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_CONFIG = {
  DRAFT: { label: "مسودة", variant: "secondary" as const, icon: AlertCircle, color: "text-gray-500" },
  CONFIRMED: { label: "مؤكد", variant: "default" as const, icon: CheckCircle, color: "text-blue-500" },
  COMPLETED: { label: "منجز", variant: "success" as const, icon: CheckCircle, color: "text-green-500" },
  CANCELLED: { label: "ملغي", variant: "destructive" as const, icon: XCircle, color: "text-red-500" },
  NO_SHOW: { label: "لم يحضر", variant: "warning" as const, icon: AlertCircle, color: "text-yellow-500" },
};

export default async function PatientDashboard() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PATIENT") redirect("/");

  const [appointments, stats] = await Promise.all([
    prisma.appointment.findMany({
      where: { patientId: session.user.id },
      include: {
        doctor: {
          include: {
            user: { select: { name: true } },
            specialty: true,
          },
        },
        clinic: true,
        review: true,
      },
      orderBy: { appointmentDate: "desc" },
    }),
    prisma.appointment.groupBy({
      by: ["status"],
      where: { patientId: session.user.id },
      _count: true,
    }),
  ]);

  const statsMap = Object.fromEntries(stats.map((s) => [s.status, s._count]));
  const upcoming = appointments.filter(
    (a) =>
      ["CONFIRMED", "DRAFT"].includes(a.status) &&
      new Date(a.appointmentDate) >= new Date()
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            مرحباً، {session.user.name} 👋
          </h1>
          <p className="text-gray-500 mt-1">إدارة مواعيدك الطبية</p>
        </div>
        <Link href="/doctors">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            حجز موعد جديد
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "إجمالي المواعيد", value: appointments.length, color: "bg-blue-50 text-blue-600" },
          { label: "مواعيد قادمة", value: upcoming.length, color: "bg-indigo-50 text-indigo-600" },
          { label: "مواعيد منجزة", value: statsMap["COMPLETED"] || 0, color: "bg-green-50 text-green-600" },
          { label: "مواعيد ملغاة", value: statsMap["CANCELLED"] || 0, color: "bg-red-50 text-red-600" },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className={`text-3xl font-bold mb-1 ${stat.color.split(" ")[1]}`}>
                {stat.value}
              </div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upcoming Appointments */}
      {upcoming.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            المواعيد القادمة
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcoming.map((apt) => {
              const config = STATUS_CONFIG[apt.status as keyof typeof STATUS_CONFIG];
              return (
                <Card key={apt.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-600 shrink-0">
                          {apt.doctor.user.name?.charAt(0) || "D"}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">
                            د. {apt.doctor.user.name}
                          </h3>
                          <p className="text-sm text-blue-600">
                            {apt.doctor.specialty.nameAr}
                          </p>
                        </div>
                      </div>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </div>

                    <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(apt.appointmentDate), "dd/MM/yyyy")}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {apt.startTime} - {apt.endTime}
                      </div>
                      {apt.clinic && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {apt.clinic.name}
                        </div>
                      )}
                    </div>

                    {apt.status === "DRAFT" && (
                      <Link href={`/appointments/${apt.id}/payment`} className="block mt-3">
                        <Button size="sm" className="w-full">
                          أكمل الدفع لتأكيد الموعد
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* All Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">كل المواعيد</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {appointments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📅</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                لا توجد مواعيد بعد
              </h3>
              <p className="text-gray-500 mb-6 text-sm">
                ابدأ بحجز موعدك الأول مع أحد أطبائنا
              </p>
              <Link href="/doctors">
                <Button>احجز موعدك الأول</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-right text-xs text-gray-500 border-b border-gray-100">
                    <th className="pb-3 pr-4 font-medium">الطبيب</th>
                    <th className="pb-3 font-medium">التاريخ</th>
                    <th className="pb-3 font-medium">الوقت</th>
                    <th className="pb-3 font-medium">الحالة</th>
                    <th className="pb-3 font-medium">المبلغ</th>
                    <th className="pb-3 font-medium">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {appointments.map((apt) => {
                    const config = STATUS_CONFIG[apt.status as keyof typeof STATUS_CONFIG];
                    return (
                      <tr key={apt.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 pr-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              د. {apt.doctor.user.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {apt.doctor.specialty.nameAr}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 text-gray-700">
                          {format(new Date(apt.appointmentDate), "dd/MM/yyyy")}
                        </td>
                        <td className="py-3 text-gray-700">{apt.startTime}</td>
                        <td className="py-3">
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </td>
                        <td className="py-3 font-semibold text-gray-900">
                          ₪{apt.fee}
                        </td>
                        <td className="py-3">
                          {apt.status === "COMPLETED" && !apt.review && (
                            <Link href={`/appointments/${apt.id}/review`}>
                              <Button size="sm" variant="outline" className="gap-1 text-xs">
                                <Star className="h-3 w-3" />
                                تقييم
                              </Button>
                            </Link>
                          )}
                          {apt.status === "DRAFT" && (
                            <Link href={`/appointments/${apt.id}/payment`}>
                              <Button size="sm" variant="default" className="text-xs">
                                ادفع
                              </Button>
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
