import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get("ids");
  
  let query = supabaseAdmin
    .from("MedicalCenter")
    .select("id, name, nameAr, address, city, phone")
    .eq("isActive", true);

  if (ids) {
    const idList = ids.split(",").filter(Boolean).slice(0, 50);
    if (idList.length) {
      query = query.in("id", idList);
    }
  }

  const { data } = await query;
  return NextResponse.json(data ?? []);
}
