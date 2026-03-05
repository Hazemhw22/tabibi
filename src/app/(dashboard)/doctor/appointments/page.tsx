import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import Link from "next/link";
import { Calendar, Clock, User, CheckCircle, XCircle, Plus, ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DoctorActions from "../doctor-actions";

type ClinicAppointmentStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "success" | "destructive" | "secondary" | "warning" | "outline" }> = {
  SCHEDULED: { label: "مجدول", variant: "default" },
  COMPLETED: { label: "منجز", variant: "success" },
  CANCELLED: { label: "ملغي", variant: "destructive" },
  NO_SHOW: { label: "غياب", variant: "warning" },
};

export default async function DoctorAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "DOCTOR") redirect("/login");

  const doctor = await prisma.doctor.findUnique({ where: { userId: session.user.id } });
  if (!doctor) redirect("/login");

  const { date, status } = await searchParams;
  const filterDate = date ? new Date(date) : null;

  const appointments = await prisma.clinicAppointment.findMany({
    where: {
      doctorId: doctor.id,
      // status في Prisma من نوع enum، بينما يأتي من الـ query كسلسلة نصية،
      // لذلك نقوم بعمل cast لتجاوز خطأ TypeScript مع الحفاظ على نفس السلوك.
      ...(status && { status: status as ClinicAppointmentStatus }),
      ...(filterDate && {
        date: {
          gte: new Date(filterDate.setHours(0, 0, 0, 0)),
          lt: new Date(filterDate.setHours(23, 59, 59, 999)),
        },
      }),
    },
    include: { clinicPatient: true },
    orderBy: [{ date: "desc" }, { time: "asc" }],
  });

  type AppointmentItem = (typeof appointments)[number];
  const today = appointments.filter(
    (a: AppointmentItem) => format(new Date(a.date), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">المواعيد</h1>
          <p className="text-gray-500 text-sm mt-0.5">{appointments.length} موعد إجمالاً</p>
        </div>
      </div>

      {/* Today's Summary */}
      {today.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-blue-800 text-sm">
                اليوم - {format(new Date(), "EEEE d MMMM")} ({today.length} موعد)
              </span>
            </div>
            <div className="space-y-2">
              {today.map((apt: AppointmentItem) => {
                const cfg = STATUS_MAP[apt.status];
                return (
                  <div key={apt.id} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-blue-100">
                    <span className="text-sm font-bold text-blue-700 w-14 text-center shrink-0">{apt.time}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{apt.clinicPatient.name}</p>
                      <p className="text-xs text-gray-500">{apt.title}</p>
                    </div>
                    <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
                    {apt.status === "SCHEDULED" && (
                      <DoctorActions appointmentId={apt.id} type="clinic" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Appointments Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">كل المواعيد</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto">
          {appointments.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Calendar className="h-10 w-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">لا توجد مواعيد</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-xs text-gray-500 border-b border-gray-100">
                  <th className="pb-3 pr-4 font-medium">المريض</th>
                  <th className="pb-3 font-medium">التاريخ</th>
                  <th className="pb-3 font-medium">الوقت</th>
                  <th className="pb-3 font-medium">الموعد</th>
                  <th className="pb-3 font-medium">الحالة</th>
                  <th className="pb-3 font-medium">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {appointments.map((apt: AppointmentItem) => {
                  const cfg = STATUS_MAP[apt.status];
                  return (
                    <tr key={apt.id} className="hover:bg-gray-50">
                      <td className="py-3 pr-4">
                        <Link href={`/dashboard/doctor/patients/${apt.clinicPatientId}`}
                          className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600 shrink-0">
                            {apt.clinicPatient.name.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-900">{apt.clinicPatient.name}</span>
                        </Link>
                      </td>
                      <td className="py-3 text-gray-600">{format(new Date(apt.date), "dd/MM/yyyy")}</td>
                      <td className="py-3 text-blue-600 font-medium">{apt.time}</td>
                      <td className="py-3 text-gray-700">{apt.title}</td>
                      <td className="py-3"><Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge></td>
                      <td className="py-3">
                        {apt.status === "SCHEDULED" && (
                          <DoctorActions appointmentId={apt.id} type="clinic" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
