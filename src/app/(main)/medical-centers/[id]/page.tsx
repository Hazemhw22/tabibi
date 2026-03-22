import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Building2, ChevronLeft } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { auth } from "@/lib/auth";
import CenterPublicBooking, {
  type CenterDoctorPublic,
} from "@/components/medical-center/center-public-booking";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await supabaseAdmin.from("MedicalCenter").select("name, nameAr").eq("id", id).maybeSingle();
  const title = (data as { nameAr?: string; name?: string } | null)?.nameAr || (data as { name?: string } | null)?.name;
  return { title: title ? `${title} | مركز طبي` : "مركز طبي" };
}

function normalizeOne<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? x[0] ?? null : x;
}

export default async function MedicalCenterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: center, error: cErr } = await supabaseAdmin
    .from("MedicalCenter")
    .select("*")
    .eq("id", id)
    .eq("isActive", true)
    .maybeSingle();

  if (cErr || !center) notFound();

  const { data: doctorsRaw } = await supabaseAdmin
    .from("Doctor")
    .select(
      `
      id,
      consultationFee,
      patientFeeServiceType,
      visibleToPatients,
      user:User(name),
      specialty:Specialty(nameAr),
      timeSlots:TimeSlot(id, dayOfWeek, startTime, endTime, isActive, clinicId, slotCapacity)
    `
    )
    .eq("medicalCenterId", id)
    .eq("status", "APPROVED")
    .order("createdAt", { ascending: true });

  const session = await auth();
  const isLoggedIn = !!session?.user;
  const isPatient = session?.user?.role === "PATIENT";

  type RawDoc = {
    id: string;
    consultationFee?: number | null;
    patientFeeServiceType?: string | null;
    visibleToPatients?: boolean | null;
    user?: { name?: string | null } | { name?: string | null }[] | null;
    specialty?: { nameAr?: string | null } | { nameAr?: string | null }[] | null;
    timeSlots?: Array<{
      id: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isActive?: boolean | null;
      clinicId?: string | null;
      slotCapacity?: number | null;
    }> | null;
  };

  const doctors: CenterDoctorPublic[] = (doctorsRaw ?? [])
    .filter((d: RawDoc) => d.visibleToPatients !== false)
    .map((d: RawDoc) => {
      const u = normalizeOne(d.user);
      const sp = normalizeOne(d.specialty);
      const slotsArr = Array.isArray(d.timeSlots) ? d.timeSlots : [];
      const slots = slotsArr
        .filter((s) => s.isActive !== false)
        .map((s) => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime.length >= 5 ? s.startTime.slice(0, 5) : s.startTime,
          endTime: s.endTime.length >= 5 ? s.endTime.slice(0, 5) : s.endTime,
          clinicId: s.clinicId ?? null,
          slotCapacity: typeof s.slotCapacity === "number" && s.slotCapacity >= 1 ? s.slotCapacity : 1,
        }));
      const feeType = d.patientFeeServiceType === "EXAMINATION" ? "EXAMINATION" : "CONSULTATION";
      return {
        id: d.id,
        consultationFee: d.consultationFee ?? 0,
        feeServiceType: feeType,
        name: u?.name?.trim() || "طبيب",
        specialtyAr: sp?.nameAr ?? "",
        slots,
      };
    });

  const specialtySet = new Set(doctors.map((d) => d.specialtyAr).filter(Boolean));
  const specialtiesList = [...specialtySet].sort((a, b) => a.localeCompare(b, "ar"));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <Link
        href="/medical-centers"
        className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-6"
      >
        <ChevronLeft className="h-4 w-4 rotate-180" />
        كل المراكز
      </Link>

      <Card className="mb-8 border-blue-100 dark:border-slate-700 dark:bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2 text-gray-900 dark:text-white">
            <Building2 className="h-7 w-7 text-blue-600 shrink-0" />
            {(center as { nameAr?: string; name: string }).nameAr || center.name}
          </CardTitle>
          <p className="text-gray-600 dark:text-slate-400 flex items-center gap-2 mt-2">
            <MapPin className="h-4 w-4 shrink-0" />
            {center.address}، {center.city}
          </p>
          {center.phone && (
            <p className="text-sm text-gray-500 dark:text-slate-500 dir-ltr text-right">{center.phone}</p>
          )}
          {center.description && (
            <p className="text-sm text-gray-700 dark:text-slate-300 mt-3">{center.description}</p>
          )}
        </CardHeader>
      </Card>

      <CenterPublicBooking
        centerId={id}
        doctors={doctors}
        specialtyOptions={specialtiesList}
        isLoggedIn={isLoggedIn}
        isPatient={isPatient}
      />
    </div>
  );
}
