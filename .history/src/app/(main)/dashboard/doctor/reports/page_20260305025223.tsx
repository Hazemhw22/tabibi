import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { TrendingUp, Calendar, UserCheck, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  if (ids.length > 0) {
    const { data: payments } = await supabaseAdmin
      .from("Payment")
      .select("amount")
      .eq("status", "PAID")
      .in("appointmentId", ids);
    revenue = (payments ?? []).reduce((s: number, p: { amount?: number }) => s + (p.amount ?? 0), 0);
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
          .select("type, amount")
          .in("clinicPatientId", cpIds)
      : Promise.resolve({ data: [] as { type: string; amount: number }[] }),
    supabaseAdmin.from("PlatformPatientTransaction").select("type, amount").eq("doctorId", doctor.id),
  ]);

  const clinicTx = (clinicTxRes.data ?? []) as { type: string; amount: number }[];
  const platformTx = (platformTxRes.data ?? []) as { type: string; amount: number }[];
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
                <Calendar className="h-5 w-5" />
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
                <UserCheck className="h-5 w-5" />
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
                <TrendingUp className="h-5 w-5" />
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
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">₪{debtAfterDeduction.toFixed(0)}</p>
                <p className="text-xs text-gray-500">الديون بعد الخصم</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-100 text-purple-600">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{aptList.length ? ((completed.length / aptList.length) * 100).toFixed(0) : 0}%</p>
                <p className="text-xs text-gray-500">نسبة الإنجاز</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ملخص المواعيد حسب الحالة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {["DRAFT", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"].map((status) => {
              const count = aptList.filter((a: { status: string }) => a.status === status).length;
              const labels: Record<string, string> = {
                DRAFT: "مسودة",
                CONFIRMED: "مؤكد",
                COMPLETED: "منجز",
                CANCELLED: "ملغي",
                NO_SHOW: "لم يحضر",
              };
              return (
                <div key={status} className="px-4 py-2 rounded-lg bg-gray-50">
                  <span className="text-gray-600">{labels[status] ?? status}: </span>
                  <span className="font-semibold">{count}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
