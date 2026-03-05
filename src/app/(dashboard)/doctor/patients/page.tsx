import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Search, Users, Phone, FileText, ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import PatientSearch from "./patient-search";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "DOCTOR") redirect("/login");

  const doctor = await prisma.doctor.findUnique({ where: { userId: session.user.id } });
  if (!doctor) redirect("/login");

  const { q } = await searchParams;

  const patients = await prisma.clinicPatient.findMany({
    where: {
      doctorId: doctor.id,
      isActive: true,
      ...(q && {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          { fileNumber: { contains: q } },
        ],
      }),
    },
    include: {
      _count: { select: { clinicAppointments: true, transactions: true } },
      transactions: {
        select: { type: true, amount: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // حساب الرصيد لكل مريض
  const patientsWithBalance = patients.map((p) => {
    const balance = p.transactions.reduce((sum, t) => {
      return t.type === "PAYMENT" ? sum + t.amount : sum - t.amount;
    }, 0);
    return { ...p, balance };
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">المرضى</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {patientsWithBalance.length} مريض مسجّل
          </p>
        </div>
        <Link href="/dashboard/doctor/patients/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> إضافة مريض
          </Button>
        </Link>
      </div>

      {/* Search */}
      <PatientSearch defaultValue={q} />

      {/* Patients Grid */}
      {patientsWithBalance.length === 0 ? (
        <div className="text-center py-20">
          <Users className="h-14 w-14 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-1">
            {q ? "لا توجد نتائج" : "لا يوجد مرضى بعد"}
          </h3>
          <p className="text-gray-400 text-sm mb-5">
            {q ? "جرّب بحثاً مختلفاً" : "ابدأ بإضافة أول مريض"}
          </p>
          {!q && (
            <Link href="/dashboard/doctor/patients/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> إضافة مريض جديد
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {patientsWithBalance.map((patient) => (
            <Link key={patient.id} href={`/dashboard/doctor/patients/${patient.id}`}>
              <Card className="hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-lg font-bold text-blue-600 shrink-0">
                        {patient.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {patient.name}
                        </h3>
                        {patient.fileNumber && (
                          <p className="text-xs text-gray-400">ملف #{patient.fileNumber}</p>
                        )}
                      </div>
                    </div>
                    <ChevronLeft className="h-4 w-4 text-gray-300 group-hover:text-blue-400 transition-colors mt-1" />
                  </div>

                  <div className="space-y-2 text-sm">
                    {patient.phone && (
                      <div className="flex items-center gap-2 text-gray-500">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span dir="ltr">{patient.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-500">
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span>{patient._count.clinicAppointments} موعد • {patient._count.transactions} معاملة</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <span className="text-xs text-gray-400">
                      {format(new Date(patient.createdAt), "dd/MM/yyyy")}
                    </span>
                    <div className={`text-sm font-bold ${patient.balance < 0 ? "text-red-500" : patient.balance > 0 ? "text-green-600" : "text-gray-500"}`}>
                      {patient.balance === 0 ? (
                        <span className="text-gray-400 font-normal text-xs">لا يوجد رصيد</span>
                      ) : (
                        <>
                          {patient.balance > 0 ? "+" : ""}₪{Math.abs(patient.balance).toFixed(0)}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
