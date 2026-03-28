import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getLinkedDoctorIdsForCenter } from "@/lib/medical-center-doctors";

/** تفاصيل مركز + كل الأطباء المعتمدين المرتبطين به (بمن فيهم غير الظاهرين في قائمة الأطباء العامة) */
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

    const doctorIds = await getLinkedDoctorIdsForCenter(id);
    let doctors: unknown[] = [];
    let dErr: { message?: string } | null = null;
    if (doctorIds.length > 0) {
      const res = await supabaseAdmin
        .from("Doctor")
        .select(`
        id,
        consultationFee,
        rating,
        experienceYears,
        bio,
        visibleToPatients,
        user:User!Doctor_userId_fkey(name, phone),
        specialty:Specialty(nameAr)
      `)
        .in("id", doctorIds)
        .eq("status", "APPROVED")
        .order("createdAt", { ascending: true });
      doctors = res.data ?? [];
      dErr = res.error;
    }

    if (dErr) {
      console.error("Center doctors:", dErr);
      return NextResponse.json({ error: "تعذر تحميل الأطباء" }, { status: 500 });
    }

    /** كل أطباء المركز المعتمدين — بمن فيهم غير الظاهرين في قائمة الأطباء العامة */
    return NextResponse.json({
      center,
      doctors: doctors ?? [],
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
