import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/** تفاصيل مركز + الأطباء المعتمدين الظاهرين للمرضى */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: center, error: cErr } = await supabaseAdmin
      .from("MedicalCenter")
      .select("*")
      .eq("id", id)
      .eq("isActive", true)
      .maybeSingle();

    if (cErr || !center) {
      return NextResponse.json({ error: "المركز غير موجود" }, { status: 404 });
    }

    const { data: doctors, error: dErr } = await supabaseAdmin
      .from("Doctor")
      .select(`
        id,
        consultationFee,
        rating,
        experienceYears,
        bio,
        visibleToPatients,
        user:User(name, phone),
        specialty:Specialty(nameAr)
      `)
      .eq("medicalCenterId", id)
      .eq("status", "APPROVED")
      .order("createdAt", { ascending: true });

    if (dErr) {
      console.error("Center doctors:", dErr);
      return NextResponse.json({ error: "تعذر تحميل الأطباء" }, { status: 500 });
    }

    const list = (doctors ?? []).filter((d: { visibleToPatients?: boolean }) => d.visibleToPatients !== false);

    return NextResponse.json({
      center,
      doctors: list,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
