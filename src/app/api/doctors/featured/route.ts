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
  user?: { name?: string; phone?: string } | { name?: string; phone?: string }[];
  specialty?: { nameAr?: string } | { nameAr?: string }[];
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
    user,
    specialty,
    clinics: d.clinics ?? [],
  };
}

/** GET /api/doctors/featured?regionId=xxx — أطباء مميزون حسب منطقة الزائر (مطلوب للموقع الرئيسي) */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const regionId = searchParams.get("regionId")?.trim() || null;

  if (!regionId) {
    return NextResponse.json(
      { error: "regionId مطلوب", doctors: [] },
      { status: 200 }
    );
  }

  const { data } = await supabaseAdmin
    .from("Doctor")
    .select(
      `id, locationId, rating, totalReviews, consultationFee, experienceYears, whatsapp,
      user:User(name, phone),
      specialty:Specialty(nameAr),
      clinics:Clinic(address, phone)`
    )
    .eq("status", "APPROVED")
    .eq("visibleToPatients", true)
    .not("locationId", "is", null)
    .order("rating", { ascending: false })
    .limit(12);

  const raw = (data ?? []) as DoctorRow[];
  const filtered = raw.filter((d) =>
    doctorServesLocation(d.locationId ?? null, regionId)
  );
  const doctors = filtered.slice(0, 6).map(normalizeDoctor);

  return NextResponse.json({ doctors });
}
