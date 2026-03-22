import { supabaseAdmin } from "@/lib/supabase-admin";

/** لقطة مالية عند إنشاء موعد لطبيب مرتبط بمركز */
export async function getAppointmentFinanceSnapshot(doctorId: string): Promise<{
  medicalCenterId: string | null;
  doctorClinicFeeSnapshot: number | null;
}> {
  const { data, error } = await supabaseAdmin
    .from("Doctor")
    .select("medicalCenterId, doctorClinicFee")
    .eq("id", doctorId)
    .maybeSingle();

  if (error || !data) {
    return { medicalCenterId: null, doctorClinicFeeSnapshot: null };
  }

  const mc = (data as { medicalCenterId?: string | null }).medicalCenterId;
  if (!mc) {
    return { medicalCenterId: null, doctorClinicFeeSnapshot: null };
  }

  const docFee = Number((data as { doctorClinicFee?: number | null }).doctorClinicFee ?? 0);
  return {
    medicalCenterId: mc,
    doctorClinicFeeSnapshot: docFee >= 0 ? docFee : 0,
  };
}
