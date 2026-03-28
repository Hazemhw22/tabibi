import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ledgerBalance } from "@/lib/patient-transaction-math";
import PatientsView from "./patients-view";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; id?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "DOCTOR") redirect("/login");

  const doctor = await prisma.doctor.findUnique({ where: { userId: session.user.id } });
  if (!doctor) redirect("/login");

  const { q, id: selectedId } = await searchParams;

  const patients = await prisma.clinicPatient.findMany({
    where: {
      doctorId: doctor.id,
      isActive: true,
      ...(q && {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          { whatsapp: { contains: q } },
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
  type PatientItem = (typeof patients)[number];
  const patientsWithBalance = patients.map((p: PatientItem) => {
    const balance = ledgerBalance(p.transactions);
    return {
      id: p.id,
      name: p.name,
      phone: p.phone,
      whatsapp: p.whatsapp,
      fileNumber: p.fileNumber,
      createdAt: p.createdAt,
      _count: p._count,
      balance,
    };
  });

  let selectedPatient: Awaited<ReturnType<typeof getSelectedPatient>> = null;
  if (selectedId) {
    selectedPatient = await getSelectedPatient(selectedId, doctor.id);
  }

  return (
    <div className="box-border flex h-[calc(100dvh-5.5rem-env(safe-area-inset-bottom,0px))] min-h-0 flex-col overflow-hidden p-3 sm:h-[calc(100dvh-6rem-env(safe-area-inset-bottom,0px))] sm:p-4">
      <PatientsView
        initialPatients={patientsWithBalance}
        initialQ={q ?? ""}
        selectedPatient={selectedPatient}
        selectedId={selectedId ?? null}
      />
    </div>
  );
}

async function getSelectedPatient(patientId: string, doctorId: string) {
  const patient = await prisma.clinicPatient.findFirst({
    where: { id: patientId, doctorId, isActive: true },
    include: {
      transactions: { orderBy: { date: "desc" } },
      clinicAppointments: { orderBy: { date: "desc" } },
    },
  });
  if (!patient) return null;
  const balance = ledgerBalance(patient.transactions);
  return {
    ...patient,
    balance,
    transactions: patient.transactions,
    clinicAppointments: patient.clinicAppointments,
  };
}
