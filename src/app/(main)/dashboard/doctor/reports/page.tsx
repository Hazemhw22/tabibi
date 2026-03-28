import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { redirectDoctorStaffToAppointments } from "@/lib/doctor-staff-route-guard";
import IconTrendingUp from "@/components/icon/icon-trending-up";
import IconCalendar from "@/components/icon/icon-calendar";
import IconCircleCheck from "@/components/icon/icon-circle-check";
import IconInfoCircle from "@/components/icon/icon-info-circle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DoctorReportsFinancialSection, {
  type DoctorFinancialRow,
} from "./doctor-reports-financial-section";

export default async function DoctorReportsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  redirectDoctorStaffToAppointments(session);
  if (session.user.role !== "DOCTOR") redirect("/");

  const { data: doctor } = await supabaseAdmin
    .from("Doctor")
    .select("id")
    .eq("userId", session.user.id)
    .single();
  if (!doctor) redirect("/dashboard/doctor/setup");

  const { data: appointments } = await supabaseAdmin
    .from("Appointment")
    .select("id, status, fee, appointmentDate")
    .eq("doctorId", doctor.id);

  const aptList = appointments ?? [];
  const completed = aptList.filter((a: { status: string }) => a.status === "COMPLETED");
  const ids = aptList.map((a: { id: string }) => a.id).filter(Boolean);
  let revenue = 0;
  let platformIncomeRows: { id: string; date: string; patientName: string; amount: number }[] = [];
  if (ids.length > 0) {
    const { data: payments } = await supabaseAdmin
      .from("Payment")
      .select("id, amount, appointmentId")
      .eq("status", "PAID")
      .in("appointmentId", ids);
    const payList = (payments ?? []) as { id: string; amount: number; appointmentId: string }[];
    revenue = payList.reduce((s, p) => s + (p.amount ?? 0), 0);
    if (payList.length > 0) {
      const aptIds = [...new Set(payList.map((p) => p.appointmentId))];
      const { data: apts } = await supabaseAdmin
        .from("Appointment")
        .select("id, appointmentDate, fee, patient:User(name)")
        .in("id", aptIds);
      const aptMap = new Map<string, { date: string; patientName: string; fee: number }>();
      for (const a of apts ?? []) {
        const row = a as { id: string; appointmentDate?: string; fee?: number; patient?: { name?: string } | { name?: string }[] };
        const patient = Array.isArray(row.patient) ? row.patient[0] : row.patient;
        aptMap.set(row.id, {
          date: row.appointmentDate ?? "",
          patientName: patient?.name ?? "—",
          fee: row.fee ?? 0,
        });
      }
      platformIncomeRows = payList.map((p) => {
        const apt = aptMap.get(p.appointmentId);
        return {
          id: p.id,
          date: apt?.date ?? "",
          patientName: apt?.patientName ?? "—",
          amount: p.amount ?? apt?.fee ?? 0,
        };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  }

  const { data: clinicPatients } = await supabaseAdmin
    .from("ClinicPatient")
    .select("id")
    .eq("doctorId", doctor.id);
  const cpIds = (clinicPatients ?? []).map((p: { id: string }) => p.id);

  const [clinicTxRes, platformTxRes] = await Promise.all([
    cpIds.length > 0
      ? supabaseAdmin
          .from("ClinicTransaction")
          .select(
            "id, type, description, amount, date, clinicPatientId, clinicPatient:ClinicPatient(name)"
          )
          .in("clinicPatientId", cpIds)
          .order("date", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabaseAdmin
      .from("PlatformPatientTransaction")
      .select("id, type, description, amount, date, patientId, patient:User(name)")
      .eq("doctorId", doctor.id)
      .order("date", { ascending: false }),
  ]);

  const clinicTxList = (clinicTxRes.data ?? []) as Array<{
    id: string;
    type: string;
    description: string;
    amount: number;
    date: string;
    clinicPatientId: string;
    clinicPatient?: { name?: string };
  }>;
  const platformTxList = (platformTxRes.data ?? []) as Array<{
    id: string;
    type: string;
    description: string;
    amount: number;
    date: string;
    patientId: string;
    patient?: { name?: string };
  }>;

  const isServiceOrPayment = (t: string) => t === "SERVICE" || t === "PAYMENT";

  const financialRows: DoctorFinancialRow[] = [
    ...clinicTxList
      .filter((t) => isServiceOrPayment(t.type))
      .map((t) => ({
        id: t.id,
        type: t.type as "SERVICE" | "PAYMENT",
        description: t.description,
        amount: t.amount,
        date: t.date,
        patientName: (t.clinicPatient as { name?: string })?.name ?? "—",
        patientKey: `c:${t.clinicPatientId}`,
        source: "عيادة" as const,
      })),
    ...platformTxList
      .filter((t) => isServiceOrPayment(t.type))
      .map((t) => ({
        id: t.id,
        type: t.type as "SERVICE" | "PAYMENT",
        description: t.description,
        amount: t.amount,
        date: t.date,
        patientName: (t.patient as { name?: string })?.name ?? "—",
        patientKey: `p:${t.patientId}`,
        source: "منصة" as const,
      })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const clinicTx = clinicTxList;
  const platformTx = platformTxList;
  const totalPaymentsAdded =
    clinicTx.filter((t) => t.type === "PAYMENT").reduce((s, t) => s + Math.abs(t.amount), 0) +
    platformTx.filter((t) => t.type === "PAYMENT").reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalServices =
    clinicTx.filter((t) => t.type === "SERVICE").reduce((s, t) => s + Math.abs(t.amount), 0) +
    platformTx.filter((t) => t.type === "SERVICE").reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalEarnings = revenue + totalPaymentsAdded;
  const debtAfterDeduction = Math.max(0, totalServices - totalPaymentsAdded);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-slate-100">التقارير</h1>
      <p className="mb-8 text-gray-500 dark:text-slate-400">ملخص أداء المواعيد والإيرادات</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 p-2.5 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <IconCalendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{aptList.length}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">إجمالي المواعيد</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-green-100 p-2.5 text-green-600 dark:bg-green-950/40 dark:text-green-400">
                <IconCircleCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{completed.length}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">مواعيد منجزة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <IconTrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">₪{totalEarnings.toFixed(0)}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">إجمالي الأرباح</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-100 p-2.5 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
                <IconInfoCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">₪{debtAfterDeduction.toFixed(0)}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">الديون المستحقة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-purple-100 p-2.5 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300">
                <IconTrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {aptList.length ? ((completed.length / aptList.length) * 100).toFixed(0) : 0}%
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400">نسبة الإنجاز</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DoctorReportsFinancialSection
        rows={financialRows}
        doctorName={session.user.name ?? ""}
      />

      <Card className="mt-8 overflow-hidden rounded-2xl border-0 shadow-lg shadow-gray-200/50 dark:border dark:border-slate-700/80 dark:shadow-slate-950/50">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-l from-slate-50 to-white px-6 py-5 dark:border-slate-700 dark:from-slate-900 dark:to-slate-950">
          <CardTitle className="text-lg dark:text-slate-100">ملخص المواعيد حسب الحالة</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="-mx-3 touch-pan-x overflow-x-auto px-3 scrollbar-hide sm:mx-0 sm:px-0">
            <table className="min-w-[320px] w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80 text-right dark:border-slate-700 dark:bg-slate-800/60">
                  <th className="px-4 py-3 font-semibold text-gray-600 dark:text-slate-400">الحالة</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 dark:text-slate-400">العدد</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 dark:text-slate-400">النسبة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/80">
                {["DRAFT", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"].map((status) => {
                  const count = aptList.filter((a: { status: string }) => a.status === status).length;
                  const pct = aptList.length ? ((count / aptList.length) * 100).toFixed(1) : "0";
                  const labels: Record<string, string> = {
                    DRAFT: "مسودة",
                    CONFIRMED: "مؤكد",
                    COMPLETED: "منجز",
                    CANCELLED: "ملغي",
                    NO_SHOW: "لم يحضر",
                  };
                  return (
                    <tr key={status} className="transition-colors hover:bg-gray-50/80 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">
                        {labels[status] ?? status}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-300">{count}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-400">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
