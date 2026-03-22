import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/** قائمة المراكز الطبية النشطة (للمريض) */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("MedicalCenter")
      .select("id, name, nameAr, slug, address, city, phone, locationId, description, imageUrl")
      .eq("isActive", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Medical centers list:", error);
      return NextResponse.json({ error: "تعذر تحميل المراكز" }, { status: 500 });
    }

    return NextResponse.json({ centers: data ?? [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
