import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { assertApprovedMedicalCenter } from "@/lib/medical-center-auth";
import { CENTER_ROLES_ALL_STAFF } from "@/lib/medical-center-roles";
import { getLinkedDoctorIdsForCenter } from "@/lib/medical-center-doctors";

/** إحصائيات سريعة للوحة المركز */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const gate = await assertApprovedMedicalCenter(session.user.id, { roles: CENTER_ROLES_ALL_STAFF });
    if (!gate.ok) return gate.response;
    const centerId = gate.centerId;

    const { data: center } = await supabaseAdmin
      .from("MedicalCenter")
      .select("*")
      .eq("id", centerId)
      .single();

    const ids = await getLinkedDoctorIdsForCenter(centerId);
    let appointmentsCount = 0;
    let patientsDistinct = 0;

    if (ids.length) {
      const { count: ac } = await supabaseAdmin
        .from("Appointment")
        .select("id", { count: "exact", head: true })
        .eq("medicalCenterId", centerId)
        .in("doctorId", ids)
        .in("status", ["DRAFT", "CONFIRMED", "COMPLETED"]);
      appointmentsCount = ac ?? 0;

      const { data: pRows } = await supabaseAdmin
        .from("Appointment")
        .select("patientId")
        .eq("medicalCenterId", centerId)
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
