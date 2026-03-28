import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isDoctorStaffRole } from "@/lib/doctor-team-roles";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import Link from "next/link";
import IconUsers from "@/components/icon/icon-users";
import IconDollarSign from "@/components/icon/icon-dollar-sign";
import IconCalendar from "@/components/icon/icon-calendar";
import IconHeart from "@/components/icon/icon-heart";
import IconExclamationTriangle from "@/components/icon/icon-exclamation-triangle";
import IconReceipt from "@/components/icon/icon-receipt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DoctorActions from "./doctor-actions";
import DoctorDashboardFinanceCharts from "./doctor-dashboard-finance-charts";
import {
  aggregateDoctorMonthlyFinance,
  buildLastNMonthBuckets,
} from "@/lib/doctor-dashboard-monthly-finance";
import UpcomingAppointments, { type ScheduleApt } from "./upcoming-appointments";
import DoctorMedicalCenterInvitesCard from "@/components/medical-center/doctor-medical-center-invites-card";
import { amountSignedColorClass, formatSignedShekel } from "@/lib/money-display";
import { transactionSignedDelta } from "@/lib/patient-transaction-math";
import { cn } from "@/lib/utils";

export default async function DoctorDashboard() {
  const session = await auth();
  if (!session) redirect("/login");
  if (isDoctorStaffRole(session.user.role)) {
    redirect("/dashboard/doctor/appointments");
  }
  if (session.user.role !== "DOCTOR") redirect("/");

  const { data: doctor } = await supabaseAdmin
    .from("Doctor")
    .select(`*, specialty:Specialty(*), clinics:Clinic(*), timeSlots:TimeSlot(*), subscriptionPeriod, subscriptionEndDate`)
    .eq("userId", session.user.id)
    .single();

  if (!doctor) redirect("/dashboard/doctor/setup");

  if (doctor.status === "PENDING") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-6">⏳</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">حسابك قيد المراجعة</h1>
        <p className="text-gray-500 leading-relaxed">
          شكراً لتسجيلك في منصة Tabibi. سيتم مراجعة طلبك من قِبل فريقنا وإشعارك بالقبول قريباً.
        </p>
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl inline-flex items-center gap-3">
          <IconExclamationTriangle className="h-5 w-5 text-yellow-600" />
          <p className="text-sm text-yellow-800 font-medium">مدة المراجعة: 24-48 ساعة عمل</p>
        </div>
      </div>
    );
  }

  if (doctor.status === "REJECTED") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-6">🚫</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">لوحة التحكم</h1>
        <p className="text-gray-500 leading-relaxed">
          تم رفض طلب تسجيلك كطبيب. يرجى مراجعة مسؤول النظام للاستفسار عن السبب.
        </p>
        <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-xl inline-flex items-center gap-3">
          <IconExclamationTriangle className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-800 font-medium">يجب مراجعة مسؤول النظام</p>
        </div>
      </div>
    );
  }

  /* ─────────────── Dates ─────────────── */
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const thirtyDaysAhead = new Date(today);
  thirtyDaysAhead.setDate(today.getDate() + 30);

  /* ─────────────── Clinic patients ─────────────── */
  const { data: clinicPatients } = await supabaseAdmin
    .from("ClinicPatient")
    .select("id")
    .eq("doctorId", doctor.id);
  const cpIds = (clinicPatients ?? []).map((p: { id: string }) => p.id);

  /* ─────────────── Data fetches ─────────────── */
  const [
    { data: todayPlatform },
    { data: todayClinic },
    { data: allAppointments },
    { data: payments },
    { data: clinicTx },
    { data: platformTx },
    clinicTxListRes,
    platformTxListRes,
    { data: upcomingPlatform },
    { data: upcomingClinic },
    { count: totalClinicAptCount },
  ] = await Promise.all([
    /* today platform */
    supabaseAdmin
      .from("Appointment")
      .select(`*, patient:User(name, phone, email)`)
      .eq("doctorId", doctor.id)
      .gte("appointmentDate", today.toISOString())
      .lt("appointmentDate", tomorrow.toISOString())
      .order("startTime"),

    /* today clinic */
    supabaseAdmin
      .from("ClinicAppointment")
      .select(`id, title, date, time, duration, status, clinicPatient:ClinicPatient(name, phone)`)
      .eq("doctorId", doctor.id)
      .gte("date", today.toISOString())
      .lt("date", tomorrow.toISOString())
      .order("time"),

    /* all appointments (status + patientId for stats) */
    supabaseAdmin.from("Appointment").select("status, patientId").eq("doctorId", doctor.id),

    /* paid payments */
    supabaseAdmin
      .from("Payment")
      .select(`amount, appointment:Appointment!inner(doctorId)`)
      .eq("status", "PAID")
      .eq("appointment.doctorId", doctor.id),

    /* clinic transactions */
    cpIds.length > 0
      ? supabaseAdmin.from("ClinicTransaction").select("type, amount").in("clinicPatientId", cpIds)
      : Promise.resolve({ data: [] as { type: string; amount: number }[] }),

    /* platform transactions */
    supabaseAdmin.from("PlatformPatientTransaction").select("type, amount").eq("doctorId", doctor.id),

    /* last 5 clinic tx */
    cpIds.length > 0
      ? supabaseAdmin
          .from("ClinicTransaction")
          .select("id, type, description, amount, date, clinicPatient:ClinicPatient(name)")
          .in("clinicPatientId", cpIds)
          .order("date", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),

    /* last 5 platform tx */
    supabaseAdmin
      .from("PlatformPatientTransaction")
      .select("id, type, description, amount, date, patient:User(name)")
      .eq("doctorId", doctor.id)
      .order("date", { ascending: false })
      .limit(5),

    /* upcoming platform appointments (next 30 days) */
    supabaseAdmin
      .from("Appointment")
      .select(`id, appointmentDate, startTime, endTime, status, fee, patient:User(name)`)
      .eq("doctorId", doctor.id)
      .gte("appointmentDate", today.toISOString())
      .lte("appointmentDate", thirtyDaysAhead.toISOString())
      .in("status", ["CONFIRMED", "DRAFT"])
      .order("appointmentDate", { ascending: true })
      .limit(60),

    /* upcoming clinic appointments (next 30 days) */
    supabaseAdmin
      .from("ClinicAppointment")
      .select(`id, date, time, status, clinicPatient:ClinicPatient(name)`)
      .eq("doctorId", doctor.id)
      .gte("date", today.toISOString())
      .lte("date", thirtyDaysAhead.toISOString())
      .in("status", ["SCHEDULED"])
      .order("date", { ascending: true })
      .limit(60),

    /* total clinic appointments count */
    cpIds.length > 0
      ? supabaseAdmin
          .from("ClinicAppointment")
          .select("id", { count: "exact", head: true })
          .in("clinicPatientId", cpIds)
      : Promise.resolve({ count: 0, data: null, error: null }),
  ]);

  /* ─────────────── Finance calculations ─────────────── */
  const clinicTxData = (clinicTx ?? []) as { type: string; amount: number }[];
  const clinicPayments = clinicTxData.reduce(
    (s, t) => (t.type === "PAYMENT" ? s + Math.abs(t.amount) : s),
    0,
  );
  const totalServices =
    clinicTxData.reduce((s, t) => (t.type === "SERVICE" ? s + Math.abs(t.amount) : s), 0) +
    (platformTx ?? []).reduce(
      (s: number, t: { type: string; amount: number }) =>
        t.type === "SERVICE" ? s + Math.abs(t.amount) : s,
      0,
    );
  const platformPayments = (platformTx ?? []).reduce(
    (s: number, t: { type: string; amount: number }) =>
      t.type === "PAYMENT" ? s + Math.abs(t.amount) : s,
    0,
  );
  const totalPaymentsAdded = clinicPayments + platformPayments;
  const debtAfterDeduction = Math.max(0, totalServices - totalPaymentsAdded);

  const totalEarnings = (payments ?? []).reduce(
    (sum: number, p: { amount: number }) => sum + p.amount,
    0
  );
  const totalEarningsWithPayments = totalEarnings + totalPaymentsAdded;

  const ledgerRes = await supabaseAdmin
    .from("DoctorClinicLedger")
    .select("amount")
    .eq("doctorId", doctor.id);
  const totalClinicLedgerExpenses = ledgerRes.error
    ? 0
    : (ledgerRes.data ?? []).reduce(
        (s: number, r: { amount?: number }) => s + Number(r.amount ?? 0),
        0,
      );

  /* ─────────────── Last 6 months (charts) ─────────────── */
  const sixMonthsStart = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  sixMonthsStart.setHours(0, 0, 0, 0);
  const sixMonthsIso = sixMonthsStart.toISOString();

  const [
    { data: monthlyPayments },
    { data: monthlyPlatformTx },
    { data: monthlyClinicTx },
    { data: monthlyLedger },
    { data: monthlyCompletedApts },
  ] = await Promise.all([
    supabaseAdmin
      .from("Payment")
      .select("amount, createdAt, appointment:Appointment!inner(doctorId)")
      .eq("status", "PAID")
      .eq("appointment.doctorId", doctor.id)
      .gte("createdAt", sixMonthsIso),
    supabaseAdmin
      .from("PlatformPatientTransaction")
      .select("type, amount, date")
      .eq("doctorId", doctor.id)
      .gte("date", sixMonthsIso),
    cpIds.length > 0
      ? supabaseAdmin
          .from("ClinicTransaction")
          .select("type, amount, date")
          .in("clinicPatientId", cpIds)
          .gte("date", sixMonthsIso)
      : Promise.resolve({ data: [] as { type: string; amount: number; date: string }[] }),
    supabaseAdmin
      .from("DoctorClinicLedger")
      .select("amount, occurredAt")
      .eq("doctorId", doctor.id)
      .gte("occurredAt", sixMonthsIso),
    supabaseAdmin
      .from("Appointment")
      .select("appointmentDate, fee, doctorClinicFeeSnapshot, medicalCenterId")
      .eq("doctorId", doctor.id)
      .eq("status", "COMPLETED")
      .gte("appointmentDate", sixMonthsIso),
  ]);

  const monthBuckets = buildLastNMonthBuckets(today, 6);
  const monthlyFinanceSeries = aggregateDoctorMonthlyFinance(monthBuckets, {
    payments: (monthlyPayments ?? []) as { amount: number; createdAt: string }[],
    platformTx: (monthlyPlatformTx ?? []) as { type: string; amount: number; date: string }[],
    clinicTx: (monthlyClinicTx ?? []) as { type: string; amount: number; date: string }[],
    completedAppointments: (monthlyCompletedApts ?? []) as Array<{
      appointmentDate: string;
      fee?: number | null;
      doctorClinicFeeSnapshot?: number | null;
      medicalCenterId?: string | null;
    }>,
    ledger: (monthlyLedger ?? []) as { amount: number; occurredAt: string }[],
  });

  /* ─────────────── Last 5 transactions ─────────────── */
  type TxRow = { id: string; type: string; description: string; amount: number; date: string; patientName: string; source: string };
  const clinicTxList = (clinicTxListRes.data ?? []) as Array<{ id: string; type: string; description: string; amount: number; date: string; clinicPatient?: { name?: string } }>;
  const platformTxList = (platformTxListRes.data ?? []) as Array<{ id: string; type: string; description: string; amount: number; date: string; patient?: { name?: string } }>;
  const last5Tx: TxRow[] = [
    ...clinicTxList.map((t) => ({ id: t.id, type: t.type, description: t.description, amount: t.amount, date: t.date, patientName: (t.clinicPatient as { name?: string })?.name ?? "—", source: "عيادة" })),
    ...platformTxList.map((t) => ({ id: t.id, type: t.type, description: t.description, amount: t.amount, date: t.date, patientName: (t.patient as { name?: string })?.name ?? "—", source: "منصة" })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  /* ─────────────── Stats ─────────────── */
  const statsMap = (allAppointments ?? []).reduce(
    (acc: Record<string, number>, apt: { status: string }) => {
      acc[apt.status] = (acc[apt.status] || 0) + 1;
      return acc;
    },
    {}
  );

  /* ─────────────── Today appointments ─────────────── */
  type TodayRow = { id: string; startTime: string; endTime: string; status: string; patientName: string; patientContact: string; source: "platform" | "clinic" };
  const todayPlatformRows: TodayRow[] = (todayPlatform ?? []).map(
    (apt: { id: string; startTime: string; endTime: string; status: string; fee?: number; patient?: { name?: string; phone?: string; email?: string } }) => ({
      id: apt.id, startTime: apt.startTime, endTime: apt.endTime, status: apt.status,
      patientName: apt.patient?.name ?? "—",
      patientContact: apt.patient?.phone || apt.patient?.email || "—",
      source: "platform" as const,
    })
  );
  type ClinicAptRow = { id: string; time: string; duration?: number; status: string; clinicPatient?: { name?: string; phone?: string } | null };
  const todayClinicRows: TodayRow[] = ((todayClinic ?? []) as ClinicAptRow[]).map((apt) => {
    const [h, m] = apt.time.split(":").map(Number);
    const dur = apt.duration ?? 30;
    const endH = h + Math.floor((m + dur) / 60);
    const endM = (m + dur) % 60;
    return {
      id: apt.id,
      startTime: apt.time,
      endTime: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
      status: apt.status,
      patientName: (apt.clinicPatient as { name?: string })?.name ?? "—",
      patientContact: (apt.clinicPatient as { phone?: string })?.phone ?? "—",
      source: "clinic" as const,
    };
  });
  const todayAppointments = [...todayPlatformRows, ...todayClinicRows].sort(
    (a, b) => {
      const t = (s: string) => { const [h, m] = s.split(":").map(Number); return (h ?? 0) * 60 + (m ?? 0); };
      return t(a.startTime) - t(b.startTime);
    }
  );

  /* ─────────────── Schedule (upcoming 30 days) ─────────────── */
  const specialtyName = doctor.specialty?.nameAr ?? "طبيب";

  type UpPlatformRow = { id: string; appointmentDate: string; startTime: string; endTime?: string; status: string; fee?: number; patient?: { name?: string } };
  type UpClinicRow = { id: string; date: string; time: string; status: string; clinicPatient?: { name?: string } };

  const scheduleApts: ScheduleApt[] = [
    ...((upcomingPlatform ?? []) as UpPlatformRow[]).map((a) => ({
      id: a.id,
      date: a.appointmentDate,
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
      patientName: (a.patient as { name?: string })?.name ?? "—",
      specialtyName,
      source: "platform" as const,
      fee: a.fee,
    })),
    ...((upcomingClinic ?? []) as UpClinicRow[]).map((a) => ({
      id: a.id,
      date: a.date,
      startTime: a.time,
      endTime: undefined,
      status: a.status,
      patientName: (a.clinicPatient as { name?: string })?.name ?? "—",
      specialtyName,
      source: "clinic" as const,
    })),
  ].sort((a, b) => {
    const da = new Date(`${a.date}T${a.startTime}`);
    const db = new Date(`${b.date}T${b.startTime}`);
    return da.getTime() - db.getTime();
  });

  const pendingApprovals = scheduleApts.filter(
    (a) => a.source === "platform" && a.status === "DRAFT"
  );

  /* ─────────────── Stats cards ─────────────── */
  // عدد المرضى الفريدين = مرضى المنصة (حجوزات فريدة) + مرضى العيادة المسجلين يدوياً
  const uniquePlatformPatients = new Set(
    (allAppointments ?? [])
      .map((a: { patientId?: string }) => a.patientId)
      .filter(Boolean)
  ).size;
  const clinicPatientsCount = cpIds.length;
  const totalPatientsCount = uniquePlatformPatients + clinicPatientsCount;
  const completedCount = statsMap["COMPLETED"] || 0;
  // إجمالي المواعيد = مواعيد المنصة + مواعيد العيادة
  const totalAllAppointments = (allAppointments ?? []).length + (totalClinicAptCount ?? 0);

  /* ─────────────── Subscription ─────────────── */
  const subDaysLeft = doctor.subscriptionEndDate
    ? Math.ceil((new Date(doctor.subscriptionEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  /* ════════════════════════════════════════ */
  /*                  RENDER                  */
  /* ════════════════════════════════════════ */
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-800">لوحة التحكم</h1>
          <p className="text-xs text-slate-400 mt-0.5">مرحباً بك، د. {session.user.name}</p>
        </div>
        <Link href="/dashboard/doctor/settings">
          <Button variant="outline" size="sm">الإعدادات</Button>
        </Link>
      </div>

      <DoctorMedicalCenterInvitesCard />

      {/* ── 4 Stats cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "المرضى",
            value: totalPatientsCount,
            icon: IconUsers,
            bg: "bg-violet-50",
            iconColor: "text-violet-500",
            valueFmt: (v: number | string) => String(v),
          },
          {
            label: "اجمالي الربح",
            value: totalEarningsWithPayments,
            icon: IconDollarSign,
            bg: "bg-blue-50",
            iconColor: "text-blue-500",
            valueFmt: (v: number | string) => `₪${Number(v).toFixed(0)}`,
          },
          {
            label: "إجمالي المواعيد",
            value: totalAllAppointments,
            icon: IconCalendar,
            bg: "bg-teal-50",
            iconColor: "text-teal-500",
            valueFmt: (v: number | string) => String(v),
          },
          {
            label: "المعالجات",
            value: completedCount,
            icon: IconHeart,
            bg: "bg-pink-50",
            iconColor: "text-pink-500",
            valueFmt: (v: number | string) => String(v),
          },
        ].map((stat, i) => (
          <Card key={i} className="border-0 shadow-sm bg-white">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div
                  className={`h-11 w-11 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}
                >
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-400 mb-0.5">{stat.label}</p>
                  <p className="font-heading text-2xl font-bold text-slate-800 leading-none">
                    {stat.valueFmt(stat.value)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <DoctorDashboardFinanceCharts
        series={monthlyFinanceSeries}
        totalEarningsNis={totalEarningsWithPayments}
        expensesNis={totalClinicLedgerExpenses}
        receivablesNis={debtAfterDeduction}
      />

      {/* ── Main grid: Upcoming Appointments + Appoint Request ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Upcoming Appointments (client component with day strip) */}
        <div className="lg:col-span-2">
          <UpcomingAppointments
            schedule={scheduleApts}
            todayDay={today.getDate()}
            currentMonth={today.getMonth()}
            currentYear={today.getFullYear()}
          />
        </div>

        {/* Appoint Request */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm h-full">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="font-heading font-bold text-slate-800 text-lg">طلبات الحجز</h2>
              <Link
                href="/dashboard/doctor/appointments"
                className="text-xs text-blue-600 font-medium"
              >
                عرض الكل
              </Link>
            </div>

            <div className="px-5 pb-5 space-y-3">
              {pendingApprovals.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">
                  لا توجد طلبات حجز معلقة
                </div>
              ) : (
                pendingApprovals.slice(0, 6).map((apt) => (
                  <div
                    key={apt.id}
                    className="border border-slate-100 rounded-xl p-3.5 space-y-2.5 hover:border-blue-100 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {apt.patientName.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-800 truncate">
                          {apt.patientName}
                        </p>
                        <p className="text-[11px] text-slate-400 leading-tight">
                          {format(new Date(apt.date), "d MMM", { locale: ar })}،{" "}
                          {apt.startTime}
                          {apt.endTime ? ` - ${apt.endTime}` : ""}
                        </p>
                        <p className="text-[11px] text-blue-500 mt-0.5 truncate">
                          {apt.specialtyName}
                        </p>
                      </div>
                    </div>
                    <DoctorActions appointmentId={apt.id} mode="approval" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Financial summary ── */}
      {last5Tx.length > 0 && (
        <Card className="overflow-hidden border-0 bg-white shadow-sm dark:border dark:border-slate-700/80 dark:bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <IconReceipt className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                آخر 5 معاملات مالية
              </span>
              <div className="flex items-center gap-4 text-xs font-normal text-slate-500 dark:text-slate-400">
                <Link href="/dashboard/doctor/reports" className="text-blue-600 dark:text-blue-400">
                  التقارير
                </Link>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto pt-0">
            <table className="w-full min-w-[400px] text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-right text-gray-400 dark:border-slate-700 dark:text-slate-500">
                  <th className="px-2 py-2 font-medium">التاريخ</th>
                  <th className="px-2 py-2 font-medium">المريض</th>
                  <th className="px-2 py-2 font-medium">المصدر</th>
                  <th className="px-2 py-2 font-medium">النوع</th>
                  <th className="px-2 py-2 font-medium">المبلغ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700/80">
                {last5Tx.map((row) => {
                  const signed = transactionSignedDelta({
                    type: row.type,
                    amount: row.amount,
                  });
                  return (
                    <tr
                      key={`${row.source}-${row.id}`}
                      className="text-right transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/60"
                    >
                      <td className="px-2 py-2 text-gray-500 dark:text-slate-400">
                        {format(new Date(row.date), "d/M", { locale: ar })}
                      </td>
                      <td className="max-w-[80px] truncate px-2 py-2 font-medium text-gray-800 dark:text-slate-200">
                        {row.patientName}
                      </td>
                      <td className="px-2 py-2 text-gray-500 dark:text-slate-400">{row.source}</td>
                      <td className="px-2 py-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "px-1.5 py-0 text-[10px] font-medium",
                            row.type === "PAYMENT"
                              ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : "border-red-200 bg-red-50 text-red-800 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300",
                          )}
                        >
                          {row.type === "PAYMENT" ? "دفعة" : "دين"}
                        </Badge>
                      </td>
                      <td className={cn("px-2 py-2 font-semibold tabular-nums", amountSignedColorClass(signed))}>
                        {formatSignedShekel(signed)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ── Subscription card ── */}
      {doctor.subscriptionPeriod && doctor.subscriptionEndDate && subDaysLeft !== null && (
        <Card
          className={`border-0 shadow-sm ${
            subDaysLeft <= 7 ? "bg-amber-50 border-amber-200" : "bg-blue-50/50"
          }`}
        >
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <span className="font-semibold text-slate-700">
                الاشتراك:{" "}
                {doctor.subscriptionPeriod === "monthly"
                  ? "شهري ₪80"
                  : doctor.subscriptionPeriod === "half_year"
                    ? "نصف سنة ₪400"
                    : "سنة ₪800"}
              </span>
              <span className="text-slate-500 mr-3">
                ينتهي: {format(new Date(doctor.subscriptionEndDate), "dd/MM/yyyy", { locale: ar })}
              </span>
            </div>
            <span
              className={`text-sm font-bold ${
                subDaysLeft <= 7 ? "text-amber-600" : "text-green-600"
              }`}
            >
              {subDaysLeft > 0 ? `متبقي ${subDaysLeft} يوم` : "منتهي"}
            </span>
          </CardContent>
        </Card>
      )}

      {/* ── No clinic warning ── */}
      {doctor.clinics?.length === 0 && (
        <Card className="border-orange-200 bg-orange-50 border-0 shadow-sm">
          <CardContent className="p-4">
            <h4 className="font-semibold text-orange-800 text-sm mb-1">⚠️ أضف عيادتك</h4>
            <p className="text-xs text-orange-700 mb-3">
              لم تضف عيادة بعد. أضف عيادتك لاستقبال المرضى.
            </p>
            <Link href="/dashboard/doctor/settings">
              <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                إضافة عيادة
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
