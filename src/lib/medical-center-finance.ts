import { supabaseAdmin } from "@/lib/supabase-admin";

/** لقطة مالية عند إنشاء موعد لطبيب مرتبط بمركز */
export async function getAppointmentFinanceSnapshot(doctorId: string): Promise<{
  medicalCenterId: string | null;
  consultationFeeSnapshot: number | null;
  doctorClinicFeeSnapshot: number | null;
}> {
  const { data, error } = await supabaseAdmin
    .from("Doctor")
    .select("medicalCenterId, consultationFee, doctorClinicFee")
    .eq("id", doctorId)
    .maybeSingle();

  if (error || !data) {
    return { medicalCenterId: null, consultationFeeSnapshot: null, doctorClinicFeeSnapshot: null };
  }

  const row = data as {
    medicalCenterId?: string | null;
    consultationFee?: number | null;
    doctorClinicFee?: number | null;
  };
  const mc = row.medicalCenterId;
  if (!mc) {
    return { medicalCenterId: null, consultationFeeSnapshot: null, doctorClinicFeeSnapshot: null };
  }

  const centerFee = Number(row.consultationFee ?? 0);
  const docFee = Number(row.doctorClinicFee ?? 0);
  return {
    medicalCenterId: mc,
    consultationFeeSnapshot: centerFee >= 0 ? centerFee : 0,
    doctorClinicFeeSnapshot: docFee >= 0 ? docFee : 0,
  };
}
