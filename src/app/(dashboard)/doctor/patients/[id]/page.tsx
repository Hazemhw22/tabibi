import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArrowRight, Phone, Mail, MapPin, Calendar, Droplets, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { format, differenceInYears } from "date-fns";
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
        <ArrowRight className="h-4 w-4" /> قائمة المرضى
      </Link>

      {/* Patient Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center text-4xl font-bold text-blue-600 shrink-0">
            {patient.name.charAt(0)}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {patient.fileNumber && (
                    <Badge variant="secondary">ملف #{patient.fileNumber}</Badge>
                  )}
                  {patient.gender && (
                    <Badge variant="outline">
                      {patient.gender === "male" ? "ذكر" : "أنثى"}
                    </Badge>
                  )}
                  {age !== null && (
                    <Badge variant="outline">{age} سنة</Badge>
                  )}
                  {patient.bloodType && (
                    <Badge variant="default" className="gap-1">
                      <Droplets className="h-3 w-3" />{patient.bloodType}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Balance */}
              <div className={`text-left px-5 py-3 rounded-xl border-2 ${
                balance < 0 ? "border-red-200 bg-red-50"
                : balance > 0 ? "border-green-200 bg-green-50"
                : "border-gray-200 bg-gray-50"
              }`}>
                <div className="text-xs text-gray-500 mb-0.5">الرصيد الحالي</div>
                <div className={`text-2xl font-bold ${
                  balance < 0 ? "text-red-600" : balance > 0 ? "text-green-600" : "text-gray-500"
                }`}>
                  {balance >= 0 ? "+" : ""}₪{balance.toFixed(0)}
                </div>
                <div className="text-xs mt-0.5 text-gray-400">
                  {balance < 0 ? "مديون" : balance > 0 ? "له رصيد" : "مسدَّد"}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
              {patient.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  <span dir="ltr">{patient.phone}</span>
                </div>
              )}
              {patient.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{patient.email}</span>
                </div>
              )}
              {patient.address && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{patient.address}</span>
                </div>
              )}
              {patient.dateOfBirth && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{format(new Date(patient.dateOfBirth), "dd/MM/yyyy")}</span>
                </div>
              )}
            </div>

            {patient.allergies && (
              <div className="mt-3 flex items-start gap-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span><strong>تنبيه:</strong> {patient.allergies}</span>
              </div>
            )}
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
