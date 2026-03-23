import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import IconArrowForward from "@/components/icon/icon-arrow-forward";
import IconPhone from "@/components/icon/icon-phone";
import IconExclamationTriangle from "@/components/icon/icon-exclamation-triangle";
import Link from "next/link";
import { format, differenceInYears } from "date-fns";
import PatientTabs from "./patient-tabs";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session || session.user.role !== "DOCTOR") redirect("/login");

  const doctor = await prisma.doctor.findUnique({ where: { userId: session.user.id } });
  if (!doctor) redirect("/login");

  const patient = await prisma.clinicPatient.findUnique({
    where: { id },
    include: {
      transactions: { orderBy: { date: "desc" } },
      clinicAppointments: { orderBy: { date: "desc" } },
    },
  });

  if (!patient || patient.doctorId !== doctor.id) notFound();

  // حساب الرصيد الكلي
  type TxItem = (typeof patient.transactions)[number];
  const balance = patient.transactions.reduce((sum: number, t: TxItem) => {
    return t.type === "PAYMENT" ? sum + t.amount : sum - t.amount;
  }, 0);

  const age = patient.dateOfBirth
    ? differenceInYears(new Date(), new Date(patient.dateOfBirth))
    : null;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/dashboard/doctor/patients" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <IconArrowForward className="h-4 w-4" /> قائمة المرضى
      </Link>

      {/* تفاصيل رئيسية أفقية + 3 بطاقات ملخص */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="h-14 w-14 shrink-0 rounded-full bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center text-xl font-bold text-blue-600">
            {patient.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{patient.name}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-600">
              {patient.allergies ? (
                <span className="flex items-center gap-1">
                  <IconExclamationTriangle className="h-3.5 w-3.5 text-amber-500" />
                  {patient.allergies}
                </span>
              ) : (
                <span className="text-gray-400">—</span>
              )}
              {patient.phone && (
                <span className="flex items-center gap-1" dir="ltr">
                  <IconPhone className="h-3.5 w-3.5 text-gray-400" />
                  {patient.phone}
                </span>
              )}
              {age !== null && <span>العمر: {age} سنة</span>}
              {patient.fileNumber && <span>ملف #{patient.fileNumber}</span>}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3">
            <div className="text-xs text-gray-500 mb-0.5">آخر زيارة</div>
            <div className="text-sm font-medium text-gray-900">
              {patient.clinicAppointments?.length
                ? format(new Date(patient.clinicAppointments[0].date), "d MMM yyyy")
                : "—"}
            </div>
          </div>
          <div
            className={`rounded-xl border px-4 py-3 ${
              balance < 0 ? "border-red-200 bg-red-50/80" : balance > 0 ? "border-green-200 bg-green-50/80" : "border-gray-100 bg-gray-50/80"
            }`}
          >
            <div className="text-xs text-gray-500 mb-0.5">الرصيد</div>
            <div className={`text-sm font-bold ${balance < 0 ? "text-red-600" : balance > 0 ? "text-green-600" : "text-gray-700"}`}>
              {balance >= 0 ? "+" : ""}₪{balance.toFixed(0)}
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3">
            <div className="text-xs text-gray-500 mb-0.5">ملاحظات / تنبيهات</div>
            <div className="text-sm font-medium text-gray-900 truncate">
              {patient.notes || patient.allergies || "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <PatientTabs
        patient={patient}
        transactions={patient.transactions}
        appointments={patient.clinicAppointments}
        balance={balance}
      />
    </div>
  );
}
