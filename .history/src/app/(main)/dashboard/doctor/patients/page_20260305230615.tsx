import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import PatientsView from "@/app/(dashboard)/doctor/patients/patients-view";

export type AppointmentRow = {
  id: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  status: string;
  fee?: number;
  title?: string;
  duration?: number;
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
  email?: string | null;
  fileNumber?: string | null;
  source: "clinic" | "platform";
  appointmentCount: number;
};

export type SelectedPatient = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  fileNumber?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  bloodType?: string | null;
  allergies?: string | null;
  notes?: string | null;
  source: "clinic" | "platform";
  appointments: AppointmentRow[];
  transactions: TransactionRow[];
  balance: number;
};

export default async function DoctorPatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; id?: string; source?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "DOCTOR") redirect("/login");

  const { data: doctor } = await supabaseAdmin
    .from("Doctor")
    .select("id, consultationFee")
    .eq("userId", session.user.id)
    .single();
  if (!doctor) redirect("/dashboard/doctor/setup");

  const { q, id: selectedId, source: selectedSource } = await searchParams;

  /* ── Clinic patients ─────────────────────────────────────────── */
  const { data: clinicRaw } = await supabaseAdmin
    .from("ClinicPatient")
    .select("id, name, phone, email, fileNumber")
    .eq("doctorId", doctor.id)
    .eq("isActive", true)
    .order("createdAt", { ascending: false });

  const clinicPatients: PatientListItem[] = (clinicRaw ?? []).map((p) => ({
    id: p.id,
    name: p.name ?? "—",
    phone: p.phone ?? null,
    email: p.email ?? null,
    fileNumber: p.fileNumber ?? null,
    source: "clinic",
    appointmentCount: 0,
  }));

  /* ── Platform patients (from Appointment table) ─────────────── */
  const { data: apts } = await supabaseAdmin
    .from("Appointment")
    .select("patientId, patient:User(id, name, email, phone)")
    .eq("doctorId", doctor.id);

  const byPatient = new Map<string, { name?: string; email?: string; phone?: string; count: number }>();
  (apts ?? []).forEach((a) => {
    const pid = a.patientId as string;
    const cur = byPatient.get(pid) ?? {
      name: (a.patient as { name?: string } | null)?.name,
      email: (a.patient as { email?: string } | null)?.email,
      phone: (a.patient as { phone?: string } | null)?.phone,
      count: 0,
    };
    cur.count += 1;
    byPatient.set(pid, cur);
  });

  const platformPatients: PatientListItem[] = Array.from(byPatient.entries()).map(([id, p]) => ({
    id,
    name: p.name ?? "—",
    phone: p.phone ?? null,
    email: p.email ?? null,
    fileNumber: null,
    source: "platform",
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
        const [{ data: txData }, { data: aptData }] = await Promise.all([
          supabaseAdmin
            .from("ClinicTransaction")
            .select("id, type, description, amount, date, notes")
            .eq("clinicPatientId", selectedId)
            .order("date", { ascending: false }),
          supabaseAdmin
            .from("ClinicAppointment")
            .select("id, date, time, status, title, duration")
            .eq("clinicPatientId", selectedId)
            .order("date", { ascending: false }),
        ]);

        const transactions: TransactionRow[] = (txData ?? []).map((t) => ({
          id: t.id, type: t.type, description: t.description,
          amount: t.amount, date: t.date, notes: t.notes,
        }));
        const appointments: AppointmentRow[] = (aptData ?? []).map((a) => ({
          id: a.id, appointmentDate: a.date ?? "", startTime: a.time ?? "",
          status: a.status, title: a.title, duration: a.duration,
        }));
        const balance = transactions.reduce(
          (s, t) => t.type === "PAYMENT" ? s + t.amount : s - t.amount, 0
        );
        selectedPatient = {
          id: cp.id, name: cp.name ?? "—", phone: cp.phone, email: cp.email,
          fileNumber: cp.fileNumber, gender: cp.gender, dateOfBirth: cp.dateOfBirth,
          address: cp.address, bloodType: cp.bloodType, allergies: cp.allergies,
          notes: cp.notes, source: "clinic", appointments, transactions, balance,
        };
      }
    }

    /* Try platform patient */
    if (!selectedPatient && selectedSource !== "clinic") {
      const [{ data: platformApts }, { data: userData }, { data: txData }] = await Promise.all([
        supabaseAdmin
          .from("Appointment")
          .select("id, appointmentDate, startTime, endTime, status, fee")
          .eq("patientId", selectedId)
          .eq("doctorId", doctor.id)
          .order("appointmentDate", { ascending: false }),
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
          id: a.id, appointmentDate: a.appointmentDate, startTime: a.startTime,
          endTime: a.endTime, status: a.status, fee: a.fee,
        }));
        const balance = transactions.reduce(
          (s, t) => t.type === "PAYMENT" ? s + t.amount : s - t.amount, 0
        );
        selectedPatient = {
          id: selectedId, name: userData?.name ?? "—",
          phone: userData?.phone ?? null,
          email: userData?.email ?? null,
          fileNumber: null, gender: null, dateOfBirth: null, address: null,
          bloodType: null, allergies: null, notes: null,
          source: "platform", appointments, transactions, balance,
        };
      }
    }
  }

  return (
    <div className="p-4 overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>
      <PatientsView
        initialPatients={allPatients}
        initialQ={q ?? ""}
        selectedPatient={selectedPatient}
        selectedId={selectedId ?? null}
        doctorId={doctor.id}
        defaultFee={(doctor as { consultationFee?: number }).consultationFee ?? 0}
      />
    </div>
  );
}
