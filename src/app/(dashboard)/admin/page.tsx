import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Users, Stethoscope, Calendar, TrendingUp, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import AdminDoctorActions from "./admin-doctor-actions";

export default async function AdminDashboard() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!["PLATFORM_ADMIN", "CLINIC_ADMIN"].includes(session.user.role)) redirect("/");

  const [totalDoctors, pendingCount, totalUsers, totalApts, revenue, pendingDoctors, recentApts] = await Promise.all([
    prisma.doctor.count({ where: { status: "APPROVED" } }),
    prisma.doctor.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { role: "PATIENT" } }),
    prisma.appointment.count(),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
    prisma.doctor.findMany({
      where: { status: "PENDING" },
      include: { user: true, specialty: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.appointment.findMany({
      include: {
        patient: { select: { name: true } },
        doctor: { include: { user: { select: { name: true } }, specialty: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">لوحة تحكم الإدارة</h1>
        <p className="text-gray-500 text-sm mt-0.5">إدارة المنصة الطبية</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "أطباء معتمدون", value: totalDoctors, icon: Stethoscope, color: "text-blue-600 bg-blue-50", border: "border-blue-100" },
          { label: "بانتظار الموافقة", value: pendingCount, icon: AlertCircle, color: "text-orange-600 bg-orange-50", border: "border-orange-100" },
          { label: "المرضى المسجلون", value: totalUsers, icon: Users, color: "text-purple-600 bg-purple-50", border: "border-purple-100" },
          { label: "إجمالي الإيرادات", value: `₪${(revenue._sum.amount || 0).toFixed(0)}`, icon: TrendingUp, color: "text-green-600 bg-green-50", border: "border-green-100" },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Doctors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              أطباء بانتظار الموافقة ({pendingCount})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {pendingDoctors.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-300" />
                <p className="text-sm">لا يوجد طلبات معلقة</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingDoctors.map((doc: (typeof pendingDoctors)[number]) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-base font-bold text-blue-600 shrink-0">
                      {doc.user.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">د. {doc.user.name}</p>
                      <p className="text-xs text-gray-500">{doc.specialty.nameAr} • {format(new Date(doc.createdAt), "dd/MM/yyyy")}</p>
                    </div>
                    <AdminDoctorActions doctorId={doc.id} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">آخر المواعيد</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {recentApts.map((apt: (typeof recentApts)[number]) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {apt.patient.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      د. {apt.doctor.user.name} • {apt.doctor.specialty.nameAr}
                    </p>
                  </div>
                  <div className="text-left mr-3">
                    <p className="text-xs text-gray-400">
                      {format(new Date(apt.appointmentDate), "dd/MM")}
                    </p>
                    <Badge
                      variant={
                        apt.status === "CONFIRMED"
                          ? "default"
                          : apt.status === "COMPLETED"
                          ? "success"
                          : apt.status === "CANCELLED"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-xs mt-0.5"
                    >
                      {apt.status === "CONFIRMED"
                        ? "مؤكد"
                        : apt.status === "COMPLETED"
                        ? "منجز"
                        : apt.status === "CANCELLED"
                        ? "ملغي"
                        : "مسودة"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
