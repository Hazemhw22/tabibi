import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { assertApprovedMedicalCenter } from "@/lib/medical-center-auth";
import { CENTER_ROLES_ALL_STAFF } from "@/lib/medical-center-roles";
import { getLinkedDoctorIdsForCenter } from "@/lib/medical-center-doctors";
import { z } from "zod";
import { findOrCreatePatientByPhone } from "@/lib/patient-account";

/** مرضى فريدون حجزوا عند أطباء المركز */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const gate = await assertApprovedMedicalCenter(session.user.id, { roles: CENTER_ROLES_ALL_STAFF });
    if (!gate.ok) return gate.response;
    const centerId = gate.centerId;

    const ids = await getLinkedDoctorIdsForCenter(centerId);
    const patientMap = new Map<string, { patient: unknown; lastVisit?: string }>();

    // 1) مرضى تم إضافتهم يدوياً للمركز (حتى بدون حجز)
    const { data: manualRows } = await supabaseAdmin
      .from("MedicalCenterPatient")
      .select("patient:User(id, name, phone, email), createdAt")
      .eq("medicalCenterId", centerId)
      .order("createdAt", { ascending: false })
      .limit(500);

    for (const r of manualRows ?? []) {
      const p = (r as { patient?: { id?: string } | null }).patient;
      const pid = p?.id;
      if (pid && !patientMap.has(pid)) {
        patientMap.set(pid, { patient: p, lastVisit: (r as { createdAt?: string }).createdAt });
      }
    }

    // 2) مرضى من حجوزات أطباء المركز
    if (ids.length) {
      const { data: apps, error } = await supabaseAdmin
        .from("Appointment")
        .select("patientId, createdAt, patient:User(id, name, phone, email)")
        .eq("medicalCenterId", centerId)
        .in("doctorId", ids)
        .order("createdAt", { ascending: false });

      if (error) {
        console.error(error);
        return NextResponse.json({ error: "تعذر التحميل" }, { status: 500 });
      }

      for (const a of apps ?? []) {
        const pid = (a as { patientId: string }).patientId;
        if (!patientMap.has(pid)) {
          patientMap.set(pid, {
            patient: (a as { patient: unknown }).patient,
            lastVisit: (a as { createdAt: string }).createdAt,
          });
        }
      }
    }

    return NextResponse.json({
      patients: Array.from(patientMap.values()),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

const postSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(6),
});

/** إضافة مريض للمركز (بدون حجز) */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const gate = await assertApprovedMedicalCenter(session.user.id, { roles: CENTER_ROLES_ALL_STAFF });
    if (!gate.ok) return gate.response;
    const centerId = gate.centerId;

    const body = await req.json().catch(() => ({}));
    const data = postSchema.parse(body);

    const res = await findOrCreatePatientByPhone(data.name.trim(), data.phone.trim());
    if ("error" in res) return NextResponse.json({ error: res.error }, { status: 400 });

    // ربط المريض بالمركز في سجل المرضى
    const { error: linkErr } = await supabaseAdmin.from("MedicalCenterPatient").upsert(
      {
        medicalCenterId: centerId,
        patientUserId: res.id,
      },
      { onConflict: "medicalCenterId,patientUserId" },
    );
    if (linkErr) {
      console.error(linkErr);
      return NextResponse.json({ error: "فشل ربط المريض بالمركز" }, { status: 500 });
    }

    return NextResponse.json({ patientUserId: res.id, created: res.created }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة", details: e.issues }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
