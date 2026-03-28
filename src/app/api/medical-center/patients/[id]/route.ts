import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { assertApprovedMedicalCenter } from "@/lib/medical-center-auth";
import { CENTER_ROLES_ALL_STAFF } from "@/lib/medical-center-roles";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const gate = await assertApprovedMedicalCenter(session.user.id, { roles: CENTER_ROLES_ALL_STAFF });
    if (!gate.ok) return gate.response;
    const centerId = gate.centerId;
    const { id } = await params;

    const { data: rel } = await supabaseAdmin
      .from("Appointment")
      .select("id")
      .eq("medicalCenterId", centerId)
      .eq("patientId", id)
      .limit(1)
      .maybeSingle();
    if (!rel) return NextResponse.json({ error: "المريض غير مرتبط بالمركز" }, { status: 404 });

    const { data: patient } = await supabaseAdmin
      .from("User")
      .select("id, name, email, phone, createdAt")
      .eq("id", id)
      .maybeSingle();
    if (!patient) return NextResponse.json({ error: "المريض غير موجود" }, { status: 404 });

    const { data: appointments } = await supabaseAdmin
      .from("Appointment")
      .select("id, appointmentDate, startTime, endTime, status, paymentStatus, fee, notes, doctor:Doctor(user:User!Doctor_userId_fkey(name), specialty:Specialty(nameAr))")
      .eq("medicalCenterId", centerId)
      .eq("patientId", id)
      .order("appointmentDate", { ascending: false })
      .limit(200);

    const { data: documents } = await supabaseAdmin
      .from("MedicalCenterPatientDocument")
      .select("id, category, title, fileUrl, fileName, notes, createdAt, uploadedByUserId")
      .eq("medicalCenterId", centerId)
      .eq("patientUserId", id)
      .order("createdAt", { ascending: false });

    return NextResponse.json({ patient, appointments: appointments ?? [], documents: documents ?? [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
