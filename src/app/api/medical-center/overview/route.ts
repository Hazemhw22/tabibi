import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getMedicalCenterIdForUser } from "@/lib/medical-center-auth";

/** إحصائيات سريعة للوحة المركز */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const centerId = await getMedicalCenterIdForUser(session.user.id);
    if (!centerId) {
      return NextResponse.json({ error: "ليس لديك صلاحية مركز طبي" }, { status: 403 });
    }

    const { data: center } = await supabaseAdmin
      .from("MedicalCenter")
      .select("*")
      .eq("id", centerId)
      .single();

    const doctorIds = await supabaseAdmin
      .from("Doctor")
      .select("id")
      .eq("medicalCenterId", centerId);

    const ids = (doctorIds.data ?? []).map((d) => d.id);
    let appointmentsCount = 0;
    let patientsDistinct = 0;

    if (ids.length) {
      const { count: ac } = await supabaseAdmin
        .from("Appointment")
        .select("id", { count: "exact", head: true })
        .in("doctorId", ids)
        .in("status", ["DRAFT", "CONFIRMED", "COMPLETED"]);
      appointmentsCount = ac ?? 0;

      const { data: pRows } = await supabaseAdmin
        .from("Appointment")
        .select("patientId")
        .in("doctorId", ids);
      patientsDistinct = new Set((pRows ?? []).map((r) => r.patientId)).size;
    }

    const { count: emergencyCount } = await supabaseAdmin
      .from("EmergencyVisit")
      .select("id", { count: "exact", head: true })
      .eq("medicalCenterId", centerId);

    return NextResponse.json({
      center,
      stats: {
        doctorsCount: ids.length,
        appointmentsCount,
        patientsCount: patientsDistinct,
        emergencyCount: emergencyCount ?? 0,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
