import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * عيادة الطبيب المرتبطة بمركز محدد (أوقات الحجز عبر المركز).
 * تفضيل العيادة التي لها نفس medicalCenterId؛ وإلا إنشاء عيادة جديدة للمركز.
 */
export async function getOrCreateMainClinicForCenterDoctor(
  doctorId: string,
  medicalCenterId: string
): Promise<{ id: string } | null> {
  const { data: byCenter, error: e1 } = await supabaseAdmin
    .from("Clinic")
    .select("id")
    .eq("doctorId", doctorId)
    .eq("medicalCenterId", medicalCenterId)
    .maybeSingle();

  if (!e1 && byCenter?.id) return { id: byCenter.id };

  const { data: center, error: c0 } = await supabaseAdmin
    .from("MedicalCenter")
    .select("name, nameAr, address, city, phone, locationId")
    .eq("id", medicalCenterId)
    .single();

  if (c0 || !center) return null;

  const { count: mainCount } = await supabaseAdmin
    .from("Clinic")
    .select("id", { count: "exact", head: true })
    .eq("doctorId", doctorId)
    .eq("isMain", true);

  const isMain = (mainCount ?? 0) === 0;

  const { data: clinic, error } = await supabaseAdmin
    .from("Clinic")
    .insert({
      doctorId,
      medicalCenterId,
      name: `${(center as { nameAr?: string; name?: string }).nameAr ?? (center as { name?: string }).name} — العيادة`,
      address: (center as { address: string }).address,
      city: (center as { city?: string }).city ?? "الخليل",
      phone: (center as { phone?: string | null }).phone,
      isMain,
      locationId: (center as { locationId?: string | null }).locationId ?? null,
    })
    .select("id")
    .single();

  if (error || !clinic) {
    console.error(error);
    return null;
  }

  return { id: clinic.id };
}
