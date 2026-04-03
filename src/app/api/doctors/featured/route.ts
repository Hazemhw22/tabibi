import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { doctorServesLocation } from "@/data/west-bank-locations";

export const dynamic = "force-dynamic";

type DoctorRow = {
  id: string;
  locationId?: string | null;
  rating?: number;
  totalReviews?: number;
  consultationFee?: number;
  experienceYears?: number;
  whatsapp?: string | null;
  user?: { name?: string; phone?: string; image?: string | null } | { name?: string; phone?: string; image?: string | null }[];
  specialtyId?: string;
  specialty?: { id?: string; nameAr?: string } | { id?: string; nameAr?: string }[];
  clinics?: { address?: string; phone?: string }[];
};

function normalizeDoctor(d: DoctorRow) {
  const user = Array.isArray(d.user) ? d.user[0] : d.user;
  const specialty = Array.isArray(d.specialty) ? d.specialty[0] : d.specialty;
  return {
    id: d.id,
    rating: d.rating,
    totalReviews: d.totalReviews,
    consultationFee: d.consultationFee,
    experienceYears: d.experienceYears,
    whatsapp: d.whatsapp,
    user: {
      name: user?.name,
      phone: user?.phone,
      image: user?.image
    },
    specialtyId: d.specialtyId,
    specialty,
    clinics: d.clinics ?? [],
  };
}

/** GET /api/doctors/featured?regionId=xxx — أطباء مميزون حسب منطقة الزائر (مطلوب للموقع الرئيسي) */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const regionId = searchParams.get("regionId")?.trim() || null;

  // We no longer require regionId to facilitate the mobile app's global doctor list

  const { data } = await supabaseAdmin
    .from("Doctor")
    .select(
      `id, locationId, rating, totalReviews, consultationFee, experienceYears, whatsapp,
      user:User!Doctor_userId_fkey(name, phone, image),
      specialtyId,
      specialty:Specialty(id, nameAr),
      clinics:Clinic(address, phone)`
    )
    .eq("status", "APPROVED")
    .eq("visibleToPatients", true)
    .order("rating", { ascending: false })
    .limit(30);

  const raw = (data ?? []) as DoctorRow[];
  const doctors = raw.map(normalizeDoctor);

  return NextResponse.json({ doctors });
}
