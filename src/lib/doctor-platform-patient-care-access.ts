import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * يحدد ما إذا كان الطبيب قد يستخدم مخطط العلاج / الملف لمريض منصة (User id):
 * موعد مع الطبيب، أو معاملة منصة، أو ملف عيادة مربوط بنفس المستخدم.
 */
export async function doctorHasCareAccessToPlatformPatient(
  doctorId: string,
  patientUserId: string,
): Promise<boolean> {
  const { data: apt } = await supabaseAdmin
    .from("Appointment")
    .select("id")
    .eq("doctorId", doctorId)
    .eq("patientId", patientUserId)
    .limit(1)
    .maybeSingle();
  if (apt) return true;

  const { data: tx } = await supabaseAdmin
    .from("PlatformPatientTransaction")
    .select("id")
    .eq("doctorId", doctorId)
    .eq("patientId", patientUserId)
    .limit(1)
    .maybeSingle();
  if (tx) return true;

  const { data: cp } = await supabaseAdmin
    .from("ClinicPatient")
    .select("id")
    .eq("doctorId", doctorId)
    .eq("userId", patientUserId)
    .limit(1)
    .maybeSingle();
  return Boolean(cp);
}
