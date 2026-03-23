import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import IconArrowForward from "@/components/icon/icon-arrow-forward";
import { Badge } from "@/components/ui/badge";
import PatientTabs from "./patient-tabs";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session || session.user.role !== "DOCTOR") redirect("/login");

  const { data: doctor } = await supabaseAdmin
    .from("Doctor")
    .select("id, consultationFee")
    .eq("userId", session.user.id)
    .single();
  if (!doctor) redirect("/dashboard/doctor/setup");

  const { data: clinicPatient } = await supabaseAdmin
    .from("ClinicPatient")
    .select("*")
    .eq("id", id)
    .eq("doctorId", doctor.id)
    .single();

  if (clinicPatient) {
    const { data: txData } = await supabaseAdmin
      .from("ClinicTransaction")
      .select("id, type, description, amount, date, notes")
      .eq("clinicPatientId", id)
      .order("date", { ascending: false });
    const { data: aptData } = await supabaseAdmin
      .from("ClinicAppointment")
      .select("id, date, time, status, title")
      .eq("clinicPatientId", id)
      .order("date", { ascending: false });
    const transactions = txData ?? [];
    const clinicAppointments = aptData ?? [];

    const balance = transactions.reduce(
      (sum: number, t: { type: string; amount: number }) =>
        t.type === "PAYMENT" ? sum + t.amount : sum - t.amount,
      0
    );

    const patientData = {
      id: clinicPatient.id,
      name: clinicPatient.name ?? "—",
      phone: clinicPatient.phone,
      email: clinicPatient.email,
      fileNumber: clinicPatient.fileNumber,
      gender: clinicPatient.gender,
      dateOfBirth: clinicPatient.dateOfBirth,
      address: clinicPatient.address,
      bloodType: clinicPatient.bloodType,
      allergies: clinicPatient.allergies,
      notes: clinicPatient.notes,
      source: "clinic" as const,
    };

    const appointmentsForTabs = clinicAppointments.map((a: { id: string; date: string; time: string; status: string; title?: string }) => ({
      id: a.id,
      appointmentDate: a.date,
      startTime: a.time,
      endTime: undefined,
      status: a.status,
      fee: undefined,
    }));

    const transactionsForTabs = transactions.map((t: { id: string; type: string; description: string; amount: number; date: string; notes?: string }) => ({
      id: t.id,
      type: t.type,
      description: t.description,
      amount: t.amount,
      date: t.date,
      notes: t.notes,
    }));

    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard/doctor/patients" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <IconArrowForward className="h-4 w-4" />
          قائمة المرضى
        </Link>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600 shrink-0">
              {(clinicPatient.name ?? "—").charAt(0)}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">{clinicPatient.name}</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                {clinicPatient.fileNumber && (
                  <Badge variant="secondary">ملف #{clinicPatient.fileNumber}</Badge>
                )}
                <Badge variant="outline">عيادة</Badge>
              </div>
              {(clinicPatient.phone || clinicPatient.email) && (
                <p className="text-sm text-gray-500 mt-2" dir="ltr">
                  {clinicPatient.phone ?? ""} {clinicPatient.email ? ` • ${clinicPatient.email}` : ""}
                </p>
              )}
            </div>
            <div className="px-4 py-2 rounded-xl bg-gray-100">
              <p className="text-xs text-gray-500">الرصيد</p>
              <p className={`text-lg font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {balance >= 0 ? "+" : ""}₪{balance.toFixed(0)}
              </p>
            </div>
          </div>
        </div>

        <PatientTabs
          patient={patientData}
          appointments={appointmentsForTabs}
          transactions={transactionsForTabs}
          balance={balance}
          doctorId={doctor.id}
          defaultFee={doctor.consultationFee ?? 0}
        />
      </div>
    );
  }

  const { data: platformAppointments } = await supabaseAdmin
    .from("Appointment")
    .select("id, appointmentDate, startTime, endTime, status, fee")
    .eq("patientId", id)
    .eq("doctorId", doctor.id)
    .order("appointmentDate", { ascending: false });

  if (!platformAppointments?.length) notFound();

  const { data: user } = await supabaseAdmin
    .from("User")
    .select("id, name, email, phone")
    .eq("id", id)
    .single();

  const { data: platformTxData } = await supabaseAdmin
    .from("PlatformPatientTransaction")
    .select("id, type, description, amount, date, notes")
    .eq("doctorId", doctor.id)
    .eq("patientId", id)
    .order("date", { ascending: false });
  const platformTransactions = platformTxData ?? [];
  const platformBalance = platformTransactions.reduce(
    (sum: number, t: { type: string; amount: number }) =>
      t.type === "PAYMENT" ? sum + t.amount : sum - t.amount,
    0
  );

  const patientData = {
    id: user?.id ?? id,
    name: user?.name ?? "—",
    phone: user?.phone,
    email: user?.email,
    fileNumber: null,
    gender: null,
    dateOfBirth: null,
    address: null,
    bloodType: null,
    allergies: null,
    notes: null,
    source: "platform" as const,
  };

  const appointmentsForTabs = (platformAppointments ?? []).map((a: { id: string; appointmentDate: string; startTime: string; endTime?: string; status: string; fee?: number }) => ({
    id: a.id,
    appointmentDate: a.appointmentDate,
    startTime: a.startTime,
    endTime: a.endTime,
    status: a.status,
    fee: a.fee,
  }));

  const transactionsForTabs = platformTransactions.map((t: { id: string; type: string; description: string; amount: number; date: string; notes?: string }) => ({
    id: t.id,
    type: t.type,
    description: t.description,
    amount: t.amount,
    date: t.date,
    notes: t.notes,
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/dashboard/doctor/patients" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <IconArrowForward className="h-4 w-4" />
        قائمة المرضى
      </Link>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600 shrink-0">
            {(user?.name ?? "—").charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{user?.name ?? "مريض"}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="default">منصة</Badge>
            </div>
            {(user?.phone || user?.email) && (
              <p className="text-sm text-gray-500 mt-2" dir="ltr">
                {user?.phone ?? ""} {user?.email ? ` • ${user?.email}` : ""}
              </p>
            )}
          </div>
          <div className={`px-4 py-2 rounded-xl border-2 shrink-0 ${
            platformBalance < 0 ? "border-red-200 bg-red-50" : platformBalance > 0 ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-100"
          }`}>
            <p className="text-xs text-gray-500">الرصيد</p>
            <p className={`text-lg font-bold ${
              platformBalance < 0 ? "text-red-600" : platformBalance > 0 ? "text-green-600" : "text-gray-600"
            }`}>
              {platformBalance >= 0 ? "+" : ""}₪{platformBalance.toFixed(0)}
            </p>
          </div>
        </div>
      </div>

      <PatientTabs
        patient={patientData}
        appointments={appointmentsForTabs}
        transactions={transactionsForTabs}
        balance={platformBalance}
        doctorId={doctor.id}
        defaultFee={doctor.consultationFee ?? 0}
      />
    </div>
  );
}
