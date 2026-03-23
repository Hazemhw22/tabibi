import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import IconTrendingUp from "@/components/icon/icon-trending-up";
import IconCalendar from "@/components/icon/icon-calendar";
import IconCircleCheck from "@/components/icon/icon-circle-check";
import IconInfoCircle from "@/components/icon/icon-info-circle";
import IconReceipt from "@/components/icon/icon-receipt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DoctorReportsPage() {
  const session = await auth();
  if (!session) redirect("/login");
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
          .select("id, type, description, amount, date, clinicPatient:ClinicPatient(name)")
          .in("clinicPatientId", cpIds)
          .order("date", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabaseAdmin
      .from("PlatformPatientTransaction")
      .select("id, type, description, amount, date, patient:User(name)")
      .eq("doctorId", doctor.id)
      .order("date", { ascending: false }),
  ]);

  type TxRow = { id: string; type: string; description: string; amount: number; date: string; patientName: string; source: string };
  const clinicTxList = (clinicTxRes.data ?? []) as Array<{
    id: string;
    type: string;
    description: string;
    amount: number;
    date: string;
    clinicPatient?: { name?: string };
  }>;
  const platformTxList = (platformTxRes.data ?? []) as Array<{
    id: string;
    type: string;
    description: string;
    amount: number;
    date: string;
    patient?: { name?: string };
  }>;

  const txRows: TxRow[] = [
    ...platformIncomeRows.map((p) => ({
      id: `platform-income-${p.id}`,
      type: "PLATFORM_INCOME",
      description: "وارد من حجز المنصة",
      amount: p.amount,
      date: p.date,
      patientName: p.patientName,
      source: "وارد المنصة",
    })),
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
      source: "منصة (معاملات)",
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const clinicTx = clinicTxList;
  const platformTx = platformTxList;
  const totalPaymentsAdded =
    clinicTx.filter((t) => t.type === "PAYMENT").reduce((s, t) => s + t.amount, 0) +
    platformTx.filter((t) => t.type === "PAYMENT").reduce((s, t) => s + t.amount, 0);
  const totalServices =
    clinicTx.filter((t) => t.type === "SERVICE").reduce((s, t) => s + t.amount, 0) +
    platformTx.filter((t) => t.type === "SERVICE").reduce((s, t) => s + t.amount, 0);
  const totalEarnings = revenue + totalPaymentsAdded;
  const debtAfterDeduction = Math.max(0, totalServices - totalPaymentsAdded);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">التقارير</h1>
      <p className="text-gray-500 mb-8">ملخص أداء المواعيد والإيرادات</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600">
                <IconCalendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{aptList.length}</p>
                <p className="text-xs text-gray-500">إجمالي المواعيد</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-100 text-green-600">
                <IconCircleCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{completed.length}</p>
                <p className="text-xs text-gray-500">مواعيد منجزة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600">
                <IconTrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">₪{totalEarnings.toFixed(0)}</p>
                <p className="text-xs text-gray-500">إجمالي الأرباح</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600">
                <IconInfoCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">₪{debtAfterDeduction.toFixed(0)}</p>
                <p className="text-xs text-gray-500">الديون المستحقة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-100 text-purple-600">
                <IconTrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{aptList.length ? ((completed.length / aptList.length) * 100).toFixed(0) : 0}%</p>
                <p className="text-xs text-gray-500">نسبة الإنجاز</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-0 shadow-lg shadow-gray-200/50 rounded-2xl">
        <CardHeader className="bg-gradient-to-l from-slate-50 to-white border-b border-gray-100 px-6 py-5">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
              <IconReceipt className="h-5 w-5" />
            </div>
            الدفعات والديون
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {txRows.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <IconReceipt className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>لا توجد دفعات أو ديون مسجلة</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 touch-pan-x scrollbar-hide">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-right border-b border-gray-100 bg-gray-50/80">
                    <th className="py-3 px-4 font-semibold text-gray-600">التاريخ</th>
                    <th className="py-3 px-4 font-semibold text-gray-600">المريض</th>
                    <th className="py-3 px-4 font-semibold text-gray-600">النوع</th>
                    <th className="py-3 px-4 font-semibold text-gray-600">الوصف</th>
                    <th className="py-3 px-4 font-semibold text-gray-600">المبلغ</th>
                    <th className="py-3 px-4 font-semibold text-gray-600">المصدر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {txRows.map((row) => (
                    <tr key={`${row.source}-${row.id}`} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4 text-gray-700">
                        {row.date ? format(new Date(row.date), "d MMM yyyy", { locale: ar }) : "—"}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">{row.patientName}</td>
                      <td className="py-3 px-4">
                        {row.type === "PLATFORM_INCOME" ? (
                          <Badge className="bg-blue-100 text-blue-800 border-0">وارد المنصة</Badge>
                        ) : (
                          <Badge variant={row.type === "PAYMENT" ? "default" : "secondary"}>
                            {row.type === "PAYMENT" ? "دفعة" : "خدمة / دين"}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{row.description}</td>
                      <td className={`py-3 px-4 font-semibold ${
                        row.type === "PLATFORM_INCOME" || row.type === "PAYMENT" ? "text-green-600" : "text-amber-600"
                      }`}>
                        {row.type === "SERVICE" ? "-" : "+"}₪{row.amount}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs">{row.source}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-8 overflow-hidden border-0 shadow-lg shadow-gray-200/50 rounded-2xl">
        <CardHeader className="bg-gradient-to-l from-slate-50 to-white border-b border-gray-100 px-6 py-5">
          <CardTitle className="text-lg">ملخص المواعيد حسب الحالة</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 touch-pan-x scrollbar-hide">
            <table className="w-full text-sm min-w-[320px]">
              <thead>
                <tr className="text-right border-b border-gray-100 bg-gray-50/80">
                  <th className="py-3 px-4 font-semibold text-gray-600">الحالة</th>
                  <th className="py-3 px-4 font-semibold text-gray-600">العدد</th>
                  <th className="py-3 px-4 font-semibold text-gray-600">النسبة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
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
                    <tr key={status} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-900">{labels[status] ?? status}</td>
                      <td className="py-3 px-4 text-gray-700">{count}</td>
                      <td className="py-3 px-4 text-gray-600">{pct}%</td>
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
