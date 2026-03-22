import { supabaseAdmin } from "@/lib/supabase-admin";

/** عيادة الطبيب الرئيسية داخل المركز (لربط أوقات العمل بجدول Clinic) */
export async function getOrCreateMainClinicForCenterDoctor(
  doctorId: string,
  medicalCenterId: string
): Promise<{ id: string } | null> {
  const { data: existing } = await supabaseAdmin
    .from("Clinic")
    .select("id")
    .eq("doctorId", doctorId)
    .eq("isMain", true)
    .maybeSingle();

  if (existing?.id) return { id: existing.id };

  const { data: center, error: c0 } = await supabaseAdmin
    .from("MedicalCenter")
    .select("name, nameAr, address, city, phone, locationId")
    .eq("id", medicalCenterId)
    .single();

  if (c0 || !center) return null;

  const { data: clinic, error } = await supabaseAdmin
    .from("Clinic")
    .insert({
      doctorId,
      name: `${(center as { nameAr?: string; name?: string }).nameAr ?? (center as { name?: string }).name} — العيادة`,
      address: (center as { address: string }).address,
      city: (center as { city?: string }).city ?? "الخليل",
      phone: (center as { phone?: string | null }).phone,
      isMain: true,
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
