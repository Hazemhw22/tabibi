import { supabaseAdmin } from "@/lib/supabase-admin";
import { doctorMarketplaceNavVisibility } from "@/lib/marketplace-specialties";

export async function getDoctorRowForUser(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("Doctor")
    .select("id, userId, status, specialty:Specialty(nameAr)")
    .eq("userId", userId)
    .maybeSingle();

  if (error) return { doctor: null as null, error: error.message };
  return { doctor: data as { id: string; userId?: string; status?: string | null; specialty?: { nameAr?: string | null } | null } | null, error: null };
}

export function assertDoctorCanManageOffers(specialtyNameAr: string | null | undefined): { ok: boolean; message?: string } {
  if (!doctorMarketplaceNavVisibility(specialtyNameAr).offers) {
    return { ok: false, message: "العروضات متاحة فقط لتخصصات الأسنان/الشعر/البشرة." };
  }
  return { ok: true };
}

export function assertDoctorCanManageProducts(specialtyNameAr: string | null | undefined): { ok: boolean; message?: string } {
  if (!doctorMarketplaceNavVisibility(specialtyNameAr).products) {
    return { ok: false, message: "المنتجات متاحة فقط لتخصصات الشعر والبشرة." };
  }
  return { ok: true };
}
