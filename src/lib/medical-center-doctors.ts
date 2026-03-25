import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * معرفات الأطباء المرتبطون بمركز: عبر Doctor.medicalCenterId أو عبر عيادة (Clinic.medicalCenterId).
 * يغطي حالات قديمة أو فشل جزئي في التحديث حيث وُجدت العيادة دون تعبئة medicalCenterId على Doctor.
 */
export async function getLinkedDoctorIdsForCenter(centerId: string): Promise<string[]> {
  const [{ data: byDoctorCol }, { data: clinics }] = await Promise.all([
    supabaseAdmin.from("Doctor").select("id").eq("medicalCenterId", centerId),
    supabaseAdmin.from("Clinic").select("doctorId").eq("medicalCenterId", centerId),
  ]);
  const fromDoctor = (byDoctorCol ?? []).map((r: { id: string }) => r.id);
  const fromClinic = (clinics ?? [])
    .map((r: { doctorId?: string | null }) => r.doctorId)
    .filter((id): id is string => Boolean(id));
  return [...new Set([...fromDoctor, ...fromClinic])];
}

/** هل يمكن للمركز إدارة هذا الطبيب (قائمة، تعديل، إلخ) */
export async function doctorIsLinkedToCenter(doctorId: string, centerId: string): Promise<boolean> {
  const { data: doc } = await supabaseAdmin
    .from("Doctor")
    .select("medicalCenterId")
    .eq("id", doctorId)
    .maybeSingle();
  const mid = (doc as { medicalCenterId?: string | null } | null)?.medicalCenterId;
  if (mid === centerId) return true;
  const { data: clinic } = await supabaseAdmin
    .from("Clinic")
    .select("id")
    .eq("doctorId", doctorId)
    .eq("medicalCenterId", centerId)
    .limit(1)
    .maybeSingle();
  return Boolean(clinic);
}
