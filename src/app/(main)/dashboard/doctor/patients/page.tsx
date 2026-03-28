import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireDoctorPageContext } from "@/lib/doctor-session-context";
import {
  carePlanShowsDentalToothChart,
  resolveCarePlanType,
  type CarePlanType,
} from "@/lib/specialty-plan-registry";
import { ledgerBalance } from "@/lib/patient-transaction-math";
import PatientsView from "./patients-view";

export type AppointmentRow = {
  id: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  status: string;
  fee?: number;
  title?: string;
  duration?: number;
  /** ملاحظات طبية عن الزيارة (ما المشكلة؟ ما العلاج؟ إلخ) */
  notes?: string | null;
};

export type TransactionRow = {
  id: string;
  type: string;
  description: string;
  amount: number;
  date: string;
  notes?: string | null;
};

export type PatientListItem = {
  id: string;
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  fileNumber?: string | null;
  source: "clinic" | "platform";
  ownership: "LOCAL" | "CENTER";
  appointmentCount: number;
};

export type MedicalNote = {
  id: string;
  allergies?: string | null;
  diagnosis?: string | null;
  treatment?: string | null;
  createdAt: string;
};

export type SelectedPatient = {
  id: string;
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  fileNumber?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  bloodType?: string | null;
  allergies?: string | null;
  notes?: string | null;
  source: "clinic" | "platform";
  ownership: "LOCAL" | "CENTER";
  appointments: AppointmentRow[];
  transactions: TransactionRow[];
  balance: number;
  medicalNotes?: MedicalNote[];
};

export default async function DoctorPatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; id?: string; source?: string; owner?: "LOCAL" | "CENTER" }>;
}) {
  const { session, doctor, isStaff } = await requireDoctorPageContext();

  const specialtyNameAr = (
    (doctor as { specialty?: { nameAr?: string | null } | null }).specialty?.nameAr ?? ""
  ).trim();
  const isDentist = specialtyNameAr === "طب أسنان";
  const carePlanType: CarePlanType = resolveCarePlanType(specialtyNameAr);
  const showDentalToothChart = isDentist || carePlanShowsDentalToothChart(carePlanType);

  const { q, id: selectedId, source: selectedSource, owner: selectedOwner } = await searchParams;

  /* ── Clinic patients ─────────────────────────────────────────── */
  const { data: clinicRaw } = await supabaseAdmin
    .from("ClinicPatient")
    .select("id, name, whatsapp, email, fileNumber")
    .eq("doctorId", doctor.id)
    .eq("isActive", true)
    .order("createdAt", { ascending: false });

  const clinicPatients: PatientListItem[] = (clinicRaw ?? []).map((p) => ({
    id: p.id,
    name: p.name ?? "—",
    whatsapp: (p as { whatsapp?: string | null }).whatsapp ?? null,
    email: p.email ?? null,
    fileNumber: p.fileNumber ?? null,
    source: "clinic",
    ownership: "LOCAL",
    appointmentCount: 0,
  }));

  /* ── Platform patients (from Appointment table) ─────────────── */
  const { data: apts } = await supabaseAdmin
    .from("Appointment")
    .select("patientId, medicalCenterId, patient:User(id, name, email, phone)")
    .eq("doctorId", doctor.id);

  const byPatient = new Map<string, { id: string; ownership: "LOCAL" | "CENTER"; name?: string; email?: string; phone?: string; count: number }>();
  (apts ?? []).forEach((a) => {
    const pid = a.patientId as string;
    const ownership: "LOCAL" | "CENTER" = a.medicalCenterId ? "CENTER" : "LOCAL";
    const key = `${pid}:${ownership}`;
    const cur = byPatient.get(key) ?? {
      id: pid,
      ownership,
      name: (a.patient as { name?: string } | null)?.name,
      email: (a.patient as { email?: string } | null)?.email,
      phone: (a.patient as { phone?: string } | null)?.phone,
      count: 0,
    };
    cur.count += 1;
    byPatient.set(key, cur);
  });

  const platformPatients: PatientListItem[] = Array.from(byPatient.values()).map((p) => ({
    id: p.id,
    name: p.name ?? "—",
    phone: p.phone ?? null,
    email: p.email ?? null,
    fileNumber: null,
    source: "platform",
    ownership: p.ownership,
    appointmentCount: p.count,
  }));

  const allPatients: PatientListItem[] = [...clinicPatients, ...platformPatients];

  /* ── Selected patient details ────────────────────────────────── */
  let selectedPatient: SelectedPatient | null = null;

  if (selectedId) {
    /* Try clinic patient first */
    if (selectedSource !== "platform") {
      const { data: cp } = await supabaseAdmin
        .from("ClinicPatient")
        .select("*")
        .eq("id", selectedId)
        .eq("doctorId", doctor.id)
        .single();

      if (cp) {
        const [{ data: txData }, { data: aptData }, { data: notesData }] = await Promise.all([
          supabaseAdmin
            .from("ClinicTransaction")
            .select("id, type, description, amount, date, notes")
            .eq("clinicPatientId", selectedId)
            .order("date", { ascending: false }),
          supabaseAdmin
            .from("ClinicAppointment")
            .select("id, date, time, status, title, duration, notes")
            .eq("clinicPatientId", selectedId)
            .order("date", { ascending: false }),
          supabaseAdmin
            .from("ClinicMedicalNote")
            .select("id, allergies, diagnosis, treatment, createdAt")
            .eq("clinicPatientId", selectedId)
            .order("createdAt", { ascending: false }),
        ]);

        const transactions: TransactionRow[] = (txData ?? []).map((t) => ({
          id: t.id, type: t.type, description: t.description,
          amount: t.amount, date: t.date, notes: t.notes,
        }));
        const appointments: AppointmentRow[] = (aptData ?? []).map((a) => ({
          id: a.id,
          appointmentDate: a.date ?? "",
          startTime: a.time ?? "",
          status: a.status,
          title: a.title,
          duration: a.duration,
          notes: (a as { notes?: string | null }).notes ?? null,
        }));
        const balance = ledgerBalance(transactions);
        const medicalNotes: MedicalNote[] = (notesData ?? []).map((n) => ({
          id: n.id,
          allergies: (n as { allergies?: string | null }).allergies ?? null,
          diagnosis: (n as { diagnosis?: string | null }).diagnosis ?? null,
          treatment: (n as { treatment?: string | null }).treatment ?? null,
          createdAt: n.createdAt as string,
        }));
        selectedPatient = {
          id: cp.id, name: cp.name ?? "—", whatsapp: (cp as { whatsapp?: string | null }).whatsapp ?? null, email: cp.email,
          fileNumber: cp.fileNumber, gender: cp.gender, dateOfBirth: cp.dateOfBirth,
          address: cp.address, bloodType: cp.bloodType, allergies: cp.allergies,
          notes: cp.notes, source: "clinic", appointments, transactions, balance,
          ownership: "LOCAL",
          medicalNotes,
        };
      }
    }

    /* Try platform patient */
    if (!selectedPatient && selectedSource !== "clinic") {
      const [{ data: platformApts }, { data: userData }, { data: txData }] = await Promise.all([
        (async () => {
          let qA = supabaseAdmin
            .from("Appointment")
            .select("id, appointmentDate, startTime, endTime, status, fee, notes, medicalCenterId")
            .eq("patientId", selectedId)
            .eq("doctorId", doctor.id)
            .order("appointmentDate", { ascending: false });
          if (selectedOwner === "CENTER") qA = qA.not("medicalCenterId", "is", null);
          else qA = qA.is("medicalCenterId", null);
          const { data } = await qA;
          return { data };
        })(),
        supabaseAdmin.from("User").select("id, name, email, phone").eq("id", selectedId).single(),
        supabaseAdmin
          .from("PlatformPatientTransaction")
          .select("id, type, description, amount, date, notes")
          .eq("doctorId", doctor.id)
          .eq("patientId", selectedId)
          .order("date", { ascending: false }),
      ]);

      if (platformApts?.length) {
        const transactions: TransactionRow[] = (txData ?? []).map((t) => ({
          id: t.id, type: t.type, description: t.description,
          amount: t.amount, date: t.date, notes: t.notes,
        }));
        const appointments: AppointmentRow[] = (platformApts ?? []).map((a) => ({
          id: a.id,
          appointmentDate: a.appointmentDate,
          startTime: a.startTime,
          endTime: a.endTime,
          status: a.status,
          fee: a.fee,
          notes: (a as { notes?: string | null }).notes ?? null,
        }));
        const balance = ledgerBalance(transactions);
        selectedPatient = {
          id: selectedId, name: userData?.name ?? "—",
          phone: userData?.phone ?? null,
          email: userData?.email ?? null,
          fileNumber: null, gender: null, dateOfBirth: null, address: null,
          bloodType: null, allergies: null, notes: null,
          source: "platform", appointments, transactions, balance,
          ownership: selectedOwner === "CENTER" ? "CENTER" : "LOCAL",
        };
      }
    }
  }

  return (
    <div className="box-border flex h-[calc(100dvh-5.5rem-env(safe-area-inset-bottom,0px))] min-h-0 min-w-0 flex-col overflow-hidden py-3 sm:h-[calc(100dvh-6rem-env(safe-area-inset-bottom,0px))] sm:py-4 -mx-3 w-auto max-w-none sm:-mx-4 md:-mx-6">
      <PatientsView
        initialPatients={allPatients}
        initialQ={q ?? ""}
        selectedPatient={selectedPatient}
        selectedId={selectedId ?? null}
        doctorId={doctor.id}
        defaultFee={(doctor as { consultationFee?: number }).consultationFee ?? 0}
        isDentist={isDentist}
        showDentalToothChart={showDentalToothChart}
        carePlanType={carePlanType}
        doctorDisplayName={session.user?.name ?? ""}
        isStaff={isStaff}
        centerDisplayName={
          ((doctor as { medicalCenter?: { nameAr?: string | null; name?: string | null } | null }).medicalCenter?.nameAr ??
            (doctor as { medicalCenter?: { name?: string | null } | null }).medicalCenter?.name ??
            "المركز الطبي")
        }
      />
    </div>
  );
}
