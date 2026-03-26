import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import Link from "next/link";
import IconCalendar from "@/components/icon/icon-calendar";
import IconClock from "@/components/icon/icon-clock";
import IconUser from "@/components/icon/icon-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DoctorActions from "../doctor-actions";

const STATUS: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "مسودة", className: "bg-amber-100 text-amber-800" },
  CONFIRMED: { label: "مؤكد", className: "bg-blue-100 text-blue-800" },
  COMPLETED: { label: "منجز", className: "bg-emerald-100 text-emerald-800" },
  CANCELLED: { label: "ملغي", className: "bg-red-100 text-red-800" },
  NO_SHOW: { label: "لم يحضر", className: "bg-gray-100 text-gray-700" },
  SCHEDULED: { label: "مجدول", className: "bg-sky-100 text-sky-800" },
};

type UnifiedAppointment = {
  id: string;
  patientId: string;
  date: string;
  time: string;
  endTime?: string;
  status: string;
  fee?: number;
  doctorDue?: number;
  isCenterBooking?: boolean;
  patientName: string;
  patientContact?: string;
  source: "platform" | "clinic";
  title?: string;
};

export default async function DoctorAppointmentsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "DOCTOR") redirect("/");

  const { data: doctor } = await supabaseAdmin
    .from("Doctor")
    .select("id")
    .eq("userId", session.user.id)
    .single();
  if (!doctor) redirect("/dashboard/doctor/setup");

  const [platformRes, clinicRes] = await Promise.all([
    supabaseAdmin
      .from("Appointment")
      .select(`
        id, patientId, appointmentDate, startTime, endTime, status, fee, medicalCenterId, doctorClinicFeeSnapshot,
        patient:User(name, phone, email)
      `)
      .eq("doctorId", doctor.id)
      .order("appointmentDate", { ascending: false })
      .limit(200),
    supabaseAdmin
      .from("ClinicAppointment")
      .select(`
        id, clinicPatientId, date, time, status, title,
        clinicPatient:ClinicPatient(name, phone, email)
      `)
      .eq("doctorId", doctor.id)
      .order("date", { ascending: false })
      .limit(200),
  ]);

  const platformList = (platformRes.data ?? []) as Array<{
    id: string;
    patientId: string;
    appointmentDate: string;
    startTime: string;
    endTime?: string;
    status: string;
    fee?: number;
    medicalCenterId?: string | null;
    doctorClinicFeeSnapshot?: number | null;
    patient?: { name?: string; phone?: string; email?: string };
  }>;
  const clinicList = (clinicRes.data ?? []) as Array<{
    id: string;
    clinicPatientId: string;
    date: string;
    time: string;
    status: string;
    title?: string;
    clinicPatient?: { name?: string; phone?: string; email?: string };
  }>;

  const unified: UnifiedAppointment[] = [
    ...platformList.map((a) => ({
      id: a.id,
      patientId: a.patientId,
      date: a.appointmentDate,
      time: a.startTime,
      endTime: a.endTime,
      status: a.status,
      fee: a.fee,
      isCenterBooking: Boolean(a.medicalCenterId),
      doctorDue: Boolean(a.medicalCenterId)
        ? Number(a.doctorClinicFeeSnapshot ?? 0)
        : Number(a.fee ?? 0),
      patientName: a.patient?.name ?? "—",
      patientContact: a.patient?.phone || a.patient?.email,
      source: "platform" as const,
      title: undefined,
    })),
    ...clinicList.map((a) => ({
      id: a.id,
      patientId: a.clinicPatientId,
      date: a.date,
      time: a.time,
      endTime: undefined,
      status: a.status,
      fee: undefined,
      patientName: (a.clinicPatient as { name?: string })?.name ?? "—",
      patientContact: (a.clinicPatient as { phone?: string; email?: string })?.phone ||
        (a.clinicPatient as { email?: string })?.email,
      source: "clinic" as const,
      title: a.title,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const upcomingMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1).filter(
    (d) => new Date(currentYear, currentMonth, d) >= new Date(now.getFullYear(), now.getMonth(), now.getDate())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-gray-900 mb-1">المواعيد</h1>
        <p className="text-gray-500">مواعيد المنصة + المواعيد المضافة من العيادة</p>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">الحجوزات القادمة</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {upcomingMonthDays.map((day) => {
              const dateObj = new Date(currentYear, currentMonth, day);
              const isToday = day === now.getDate();
              return (
                <div
                  key={day}
                  className={`min-w-11 h-11 rounded-xl border text-sm font-semibold flex items-center justify-center ${
                    isToday ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-700"
                  }`}
                  title={format(dateObj, "EEEE d MMMM", { locale: ar })}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-0 shadow-lg shadow-gray-200/50 rounded-2xl">
        <CardHeader className="bg-gradient-to-l from-slate-50 to-white border-b border-gray-100 px-6 py-5">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
              <IconCalendar className="h-5 w-5" />
            </div>
            قائمة المواعيد
            <Badge variant="secondary" className="mr-auto font-normal">
              {unified.length} موعد
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {unified.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <IconCalendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="font-medium">لا توجد مواعيد حتى الآن</p>
              <p className="text-sm mt-1">ستظهر هنا مواعيد الحجز من المنصة والمواعيد التي تضيفها للمرضى</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {unified.map((a) => {
                const config = STATUS[a.status] ?? { label: a.status, className: "bg-gray-100 text-gray-700" };
                return (
                  <div
                    key={`${a.source}-${a.id}`}
                    className="flex flex-wrap items-center gap-4 px-6 py-4 hover:bg-gray-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        <IconUser className="h-5 w-5 text-slate-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{a.patientName}</p>
                        <p className="text-xs text-gray-500 truncate" dir="ltr">
                          {a.patientContact || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <IconClock className="h-4 w-4 text-gray-400 shrink-0" />
                      <span>{format(new Date(a.date), "d MMM yyyy", { locale: ar })}</span>
                      <span className="text-gray-400">•</span>
                      <span>{a.time}{a.endTime ? ` - ${a.endTime}` : ""}</span>
                    </div>
                    {a.title && (
                      <span className="text-sm text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                        {a.title}
                      </span>
                    )}
                    <Badge className={`shrink-0 ${config.className} border-0`}>
                      {config.label}
                    </Badge>
                    {a.source === "platform" && a.status === "DRAFT" && (
                      <DoctorActions appointmentId={a.id} mode="approval" />
                    )}
                    {a.source === "platform" && a.status === "CONFIRMED" && (
                      <DoctorActions appointmentId={a.id} mode="visit" />
                    )}
                    {a.fee != null && (
                      <span
                        className="text-sm font-semibold text-emerald-600 shrink-0"
                        title={a.isCenterBooking ? "مستحق الطبيب من المركز" : "قيمة الموعد"}
                      >
                        ₪{a.doctorDue ?? a.fee}
                      </span>
                    )}
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {a.source === "platform" ? "منصة" : "عيادة"}
                    </Badge>
                    <Link
                      href={`/dashboard/doctor/patients/${a.patientId}`}
                      className="text-xs text-blue-600 hover:underline shrink-0"
                    >
                      ملف المريض
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
