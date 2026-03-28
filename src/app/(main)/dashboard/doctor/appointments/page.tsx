import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireDoctorPageContext } from "@/lib/doctor-session-context";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import Link from "next/link";
import IconCalendar from "@/components/icon/icon-calendar";
import IconClock from "@/components/icon/icon-clock";
import IconUser from "@/components/icon/icon-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DoctorActions from "../doctor-actions";
import { amountSignedColorClass, formatSignedShekel } from "@/lib/money-display";
import { cn } from "@/lib/utils";

const STATUS: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "مسودة", className: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200" },
  CONFIRMED: { label: "مؤكد", className: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200" },
  COMPLETED: { label: "منجز", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200" },
  CANCELLED: { label: "ملغي", className: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200" },
  NO_SHOW: { label: "لم يحضر", className: "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200" },
  SCHEDULED: { label: "مجدول", className: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200" },
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
  const { doctor } = await requireDoctorPageContext();

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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="mb-1 font-heading text-2xl font-bold text-gray-900 dark:text-slate-100">المواعيد</h1>
        <p className="text-gray-500 dark:text-slate-400">مواعيد المنصة + المواعيد المضافة من العيادة</p>
      </div>

      <Card className="mb-6 dark:border dark:border-slate-700/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base dark:text-slate-100">الحجوزات القادمة</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
            {upcomingMonthDays.map((day) => {
              const dateObj = new Date(currentYear, currentMonth, day);
              const isToday = day === now.getDate();
              return (
                <div
                  key={day}
                  className={cn(
                    "flex h-11 min-w-11 items-center justify-center rounded-xl border text-sm font-semibold",
                    isToday
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
                  )}
                  title={format(dateObj, "EEEE d MMMM", { locale: ar })}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-0 shadow-lg shadow-gray-200/50 dark:border dark:border-slate-700/80 dark:shadow-slate-950/50">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-l from-slate-50 to-white px-6 py-5 dark:border-slate-700 dark:from-slate-900 dark:to-slate-950">
          <CardTitle className="flex items-center gap-3 text-lg dark:text-slate-100">
            <div className="rounded-xl bg-blue-100 p-2 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <IconCalendar className="h-5 w-5" />
            </div>
            قائمة المواعيد
            <Badge variant="secondary" className="mr-auto font-normal dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {unified.length} موعد
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {unified.length === 0 ? (
            <div className="py-16 text-center text-gray-500 dark:text-slate-400">
              <IconCalendar className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-slate-600" />
              <p className="font-medium">لا توجد مواعيد حتى الآن</p>
              <p className="mt-1 text-sm">ستظهر هنا مواعيد الحجز من المنصة والمواعيد التي تضيفها للمرضى</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-700/80">
              {unified.map((a) => {
                const config = STATUS[a.status] ?? {
                  label: a.status,
                  className: "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200",
                };
                const feeSigned =
                  a.fee != null ? (a.isCenterBooking ? Number(a.doctorDue ?? a.fee) : Number(a.fee)) : null;
                return (
                  <div
                    key={`${a.source}-${a.id}`}
                    className="flex flex-wrap items-center gap-4 px-6 py-4 transition-colors hover:bg-gray-50/80 dark:hover:bg-slate-800/50"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                        <IconUser className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900 dark:text-slate-100">{a.patientName}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-slate-400" dir="ltr">
                          {a.patientContact || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
                      <IconClock className="h-4 w-4 shrink-0 text-gray-400 dark:text-slate-500" />
                      <span>{format(new Date(a.date), "d MMM yyyy", { locale: ar })}</span>
                      <span className="text-gray-400 dark:text-slate-600">•</span>
                      <span>
                        {a.time}
                        {a.endTime ? ` - ${a.endTime}` : ""}
                      </span>
                    </div>
                    {a.title && (
                      <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-sm text-gray-500 dark:bg-slate-800 dark:text-slate-300">
                        {a.title}
                      </span>
                    )}
                    <Badge className={cn("shrink-0 border-0", config.className)}>
                      {config.label}
                    </Badge>
                    {a.source === "platform" && a.status === "DRAFT" && (
                      <DoctorActions appointmentId={a.id} mode="approval" />
                    )}
                    {a.source === "platform" && a.status === "CONFIRMED" && (
                      <DoctorActions appointmentId={a.id} mode="visit" />
                    )}
                    {feeSigned != null && (
                      <span
                        className={cn("shrink-0 text-sm font-semibold tabular-nums", amountSignedColorClass(feeSigned))}
                        title={a.isCenterBooking ? "مستحق الطبيب من المركز" : "قيمة الموعد"}
                      >
                        {formatSignedShekel(feeSigned)}
                      </span>
                    )}
                    <Badge variant="outline" className="shrink-0 text-xs dark:border-slate-600 dark:text-slate-300">
                      {a.source === "platform" ? "منصة" : "عيادة"}
                    </Badge>
                    <Link
                      href={`/dashboard/doctor/patients/${a.patientId}`}
                      className="shrink-0 text-xs text-blue-600 dark:text-blue-400"
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
