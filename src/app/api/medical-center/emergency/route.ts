import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { assertApprovedMedicalCenter } from "@/lib/medical-center-auth";
import { CENTER_ROLES_ADMIN_RECEPTION } from "@/lib/medical-center-roles";
import { findOrCreatePatientByPhone } from "@/lib/patient-account";

const postSchema = z.object({
  patientName: z.string().min(2),
  patientPhone: z.string().min(6).optional(),
  complaint: z.string().optional(),
  amount: z.number().nonnegative(),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const gate = await assertApprovedMedicalCenter(session.user.id, { roles: CENTER_ROLES_ADMIN_RECEPTION });
    if (!gate.ok) return gate.response;
    const centerId = gate.centerId;

    const { data, error } = await supabaseAdmin
      .from("EmergencyVisit")
      .select("*")
      .eq("medicalCenterId", centerId)
      .order("createdAt", { ascending: false })
      .limit(200);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "تعذر التحميل" }, { status: 500 });
    }

    return NextResponse.json({ visits: data ?? [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const gate = await assertApprovedMedicalCenter(session.user.id, { roles: CENTER_ROLES_ADMIN_RECEPTION });
    if (!gate.ok) return gate.response;
    const centerId = gate.centerId;

    const body = await req.json();
    const data = postSchema.parse(body);

    let patientUserId: string | null = null;
    let patientPhone: string | null = null;
    if (data.patientPhone?.trim()) {
      patientPhone = data.patientPhone.trim();
      const pRes = await findOrCreatePatientByPhone(data.patientName.trim(), patientPhone);
      if ("error" in pRes) {
        return NextResponse.json({ error: pRes.error }, { status: 400 });
      }
      patientUserId = pRes.id;
      // ملاحظة: لا نضيفه إلى "مرضى المركز" هنا؛ قسم الطوارئ مستقل.
    }

    const { data: row, error } = await supabaseAdmin
      .from("EmergencyVisit")
      .insert({
        medicalCenterId: centerId,
        patientName: data.patientName,
        patientUserId,
        patientPhone,
        complaint: data.complaint ?? null,
        amount: data.amount,
        notes: data.notes ?? null,
        paymentMethod: null,
        paymentStatus: "UNPAID",
        registeredByUserId: session.user.id,
      })
      .select("id")
      .single();

    if (error || !row) {
      console.error(error);
      return NextResponse.json({ error: "فشل الحفظ" }, { status: 500 });
    }

    return NextResponse.json({ id: row.id, patientUserId, message: "تم تسجيل الزيارة" }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة", details: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
