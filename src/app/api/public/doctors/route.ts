import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json([]);

  const idList = ids.split(",").filter(Boolean).slice(0, 50);
  if (!idList.length) return NextResponse.json([]);

  const { data } = await supabaseAdmin
    .from("Doctor")
    .select(`
      id, rating, consultationFee, experienceYears, locationId, totalReviews, visibleToPatients,
      user:User!Doctor_userId_fkey(id, name, phone, image),
      specialty:Specialty(nameAr),
      clinics:Clinic(id, name, address, phone),
      timeSlots:TimeSlot(*)
    `)
    .in("id", idList)
    .eq("status", "APPROVED")
    .eq("visibleToPatients", true);

  return NextResponse.json(data ?? []);
}
