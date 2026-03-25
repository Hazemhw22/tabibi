import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { assertMedicalCenterApproved } from "@/lib/medical-center-auth";
import { getLinkedDoctorIdsForCenter } from "@/lib/medical-center-doctors";

/** مرضى فريدون حجزوا عند أطباء المركز */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const gate = await assertMedicalCenterApproved(session.user.id);
    if (!gate.ok) return gate.response;
    const centerId = gate.centerId;

    const ids = await getLinkedDoctorIdsForCenter(centerId);
    if (!ids.length) {
      return NextResponse.json({ patients: [] });
    }

    const { data: apps, error } = await supabaseAdmin
      .from("Appointment")
      .select("patientId, createdAt, patient:User(id, name, phone, email)")
      .in("doctorId", ids)
      .order("createdAt", { ascending: false });

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "تعذر التحميل" }, { status: 500 });
    }

    const byPatient = new Map<string, { patient: unknown; lastVisit: string }>();
    for (const a of apps ?? []) {
      const pid = (a as { patientId: string }).patientId;
      if (!byPatient.has(pid)) {
        byPatient.set(pid, {
          patient: (a as { patient: unknown }).patient,
          lastVisit: (a as { createdAt: string }).createdAt,
        });
      }
    }

    return NextResponse.json({
      patients: Array.from(byPatient.values()),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
