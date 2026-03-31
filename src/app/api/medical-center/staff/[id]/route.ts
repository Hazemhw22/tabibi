import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { assertApprovedMedicalCenter } from "@/lib/medical-center-auth";
import { CENTER_ROLE_LAB, CENTER_ROLE_RECEPTIONIST, CENTER_ROLES_ADMIN_ONLY } from "@/lib/medical-center-roles";

const STAFF_ROLES_LIST = [CENTER_ROLE_RECEPTIONIST, CENTER_ROLE_LAB];

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  salaryMonthly: z.number().nonnegative().optional().nullable(),
  educationLevel: z.string().optional().nullable(),
  staffType: z.string().optional().nullable(),
  attendanceNotes: z.string().optional().nullable(),
  attendanceScheduleJson: z.string().optional().nullable(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const gate = await assertApprovedMedicalCenter(session.user.id, { roles: CENTER_ROLES_ADMIN_ONLY });
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from("User")
      .select("id, name, email, phone, role, salaryMonthly, educationLevel, staffType, attendanceNotes, attendanceScheduleJson, createdAt")
      .eq("id", id)
      .eq("medicalCenterId", gate.centerId)
      .in("role", STAFF_ROLES_LIST)
      .maybeSingle();

    if (error) {
      // Backward compat: column may not exist yet on Supabase (migration not applied).
      const msg = String((error as { message?: string }).message ?? "");
      if (msg.toLowerCase().includes("attendanceschedulejson") || (error as { code?: string }).code === "42703") {
        const { data: fallback, error: fallbackErr } = await supabaseAdmin
          .from("User")
          .select("id, name, email, phone, role, salaryMonthly, educationLevel, staffType, attendanceNotes, createdAt")
          .eq("id", id)
          .eq("medicalCenterId", gate.centerId)
          .in("role", STAFF_ROLES_LIST)
          .maybeSingle();
        if (fallbackErr) {
          console.error("[medical-center/staff/:id] GET fallback:", fallbackErr);
          return NextResponse.json({ error: "تعذر التحميل", details: fallbackErr.message }, { status: 500 });
        }
        return NextResponse.json({
          staff: { ...(fallback as object), attendanceScheduleJson: null },
          warning: "حقل دوام الموظف غير مفعّل بعد. نفّذ: sql/medical_center_staff_schedule.sql",
        });
      }
      console.error("[medical-center/staff/:id] GET:", error);
      return NextResponse.json({ error: "تعذر التحميل", details: (error as { message?: string }).message }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
    return NextResponse.json({ staff: data });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const gate = await assertApprovedMedicalCenter(session.user.id, { roles: CENTER_ROLES_ADMIN_ONLY });
    if (!gate.ok) return gate.response;

    const body = await req.json();
    const data = patchSchema.parse(body);
    const { id } = await params;

    const { data: existing } = await supabaseAdmin
      .from("User")
      .select("id, role, medicalCenterId")
      .eq("id", id)
      .eq("medicalCenterId", gate.centerId)
      .maybeSingle();
    const ex = existing as { role?: string } | null;
    if (!ex || !STAFF_ROLES_LIST.includes(String(ex.role))) {
      return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
    }

    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.phone !== undefined) update.phone = data.phone;
    if (data.salaryMonthly !== undefined) update.salaryMonthly = data.salaryMonthly;
    if (data.educationLevel !== undefined) update.educationLevel = data.educationLevel;
    if (data.staffType !== undefined) update.staffType = data.staffType;
    if (data.attendanceNotes !== undefined) update.attendanceNotes = data.attendanceNotes;
    if (data.attendanceScheduleJson !== undefined) update.attendanceScheduleJson = data.attendanceScheduleJson;
    if (!Object.keys(update).length) {
      return NextResponse.json({ error: "لا توجد بيانات للتحديث" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("User").update(update).eq("id", id);
    if (error) {
      const msg = String((error as { message?: string }).message ?? "");
      if (msg.toLowerCase().includes("attendanceschedulejson") || (error as { code?: string }).code === "42703") {
        return NextResponse.json(
          { error: "حقل دوام الموظف غير مفعّل بعد. نفّذ: sql/medical_center_staff_schedule.sql" },
          { status: 400 }
        );
      }
      console.error("[medical-center/staff/:id] PATCH:", error);
      return NextResponse.json({ error: "فشل الحفظ", details: (error as { message?: string }).message }, { status: 500 });
    }
    return NextResponse.json({ message: "تم حفظ بيانات الموظف" });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "بيانات غير صالحة", details: e.issues }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
