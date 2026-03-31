import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { assertApprovedMedicalCenter } from "@/lib/medical-center-auth";
import { CENTER_ROLES_ALL_STAFF } from "@/lib/medical-center-roles";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const gate = await assertApprovedMedicalCenter(session.user.id, { roles: CENTER_ROLES_ALL_STAFF });
    if (!gate.ok) return gate.response;
    const centerId = gate.centerId;

    const { searchParams } = new URL(req.url);
    const emergencyVisitId = searchParams.get("emergencyVisitId")?.trim();
    if (!emergencyVisitId) return NextResponse.json({ error: "emergencyVisitId مطلوب" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("EmergencyMedicalReport")
      .select("id, emergencyVisitId, patientUserId, title, body, medications, createdByUserId, createdAt")
      .eq("medicalCenterId", centerId)
      .eq("emergencyVisitId", emergencyVisitId)
      .order("createdAt", { ascending: false })
      .limit(200);

    if (error) {
      const msg = error.message ?? "Database error";
      const schemaCacheHint =
        msg.includes("schema cache") && msg.includes("EmergencyMedicalReport")
          ? "لم يتم إنشاء جدول التقارير بعد. شغّل ملف SQL: sql/emergency_medical_reports.sql ثم من Supabase: Settings → API → Reload schema cache."
          : null;
      return NextResponse.json({ error: schemaCacheHint ?? msg }, { status: 500 });
    }
    return NextResponse.json({ reports: data ?? [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

const postSchema = z.object({
  emergencyVisitId: z.string().min(1),
  title: z.string().min(2).max(200),
  body: z.string().min(2).max(5000),
  medications: z.string().max(4000).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const gate = await assertApprovedMedicalCenter(session.user.id, { roles: CENTER_ROLES_ALL_STAFF });
    if (!gate.ok) return gate.response;
    const centerId = gate.centerId;

    const body = await req.json().catch(() => ({}));
    const data = postSchema.parse(body);

    const { data: ev } = await supabaseAdmin
      .from("EmergencyVisit")
      .select("id, patientUserId")
      .eq("id", data.emergencyVisitId)
      .eq("medicalCenterId", centerId)
      .maybeSingle();
    if (!ev) return NextResponse.json({ error: "زيارة الطوارئ غير موجودة" }, { status: 404 });

    const { data: row, error } = await supabaseAdmin
      .from("EmergencyMedicalReport")
      .insert({
        medicalCenterId: centerId,
        emergencyVisitId: data.emergencyVisitId,
        patientUserId: (ev as { patientUserId?: string | null }).patientUserId ?? null,
        title: data.title.trim(),
        body: data.body.trim(),
        medications: data.medications?.trim() || null,
        createdByUserId: session.user.id,
      })
      .select("id")
      .single();

    if (error || !row) {
      const msg = error?.message ?? "فشل الحفظ";
      const schemaCacheHint =
        msg.includes("schema cache") && msg.includes("EmergencyMedicalReport")
          ? "لم يتم إنشاء جدول التقارير بعد. شغّل ملف SQL: sql/emergency_medical_reports.sql ثم من Supabase: Settings → API → Reload schema cache."
          : null;
      return NextResponse.json({ error: schemaCacheHint ?? msg }, { status: 500 });
    }
    return NextResponse.json({ id: row.id }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "بيانات غير صالحة", details: e.issues }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

