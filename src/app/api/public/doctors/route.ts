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
      id, rating, consultationFee, experienceYears, locationId, totalReviews,
      user:User!Doctor_userId_fkey(name, phone),
      specialty:Specialty(nameAr),
      clinics:Clinic(address, phone)
    `)
    .in("id", idList)
    .eq("status", "APPROVED");

  return NextResponse.json(data ?? []);
}
