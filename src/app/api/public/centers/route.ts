import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json([]);

  const idList = ids.split(",").filter(Boolean).slice(0, 50);
  if (!idList.length) return NextResponse.json([]);

  const { data } = await supabaseAdmin
    .from("MedicalCenter")
    .select("id, name, nameAr, address, city, phone")
    .in("id", idList)
    .eq("isActive", true);

  return NextResponse.json(data ?? []);
}
