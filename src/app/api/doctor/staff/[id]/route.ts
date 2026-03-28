import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionDoctorRecordId } from "@/lib/doctor-api-scope";

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.union([z.string(), z.null()]).optional(),
  salaryMonthly: z.union([z.number().nonnegative(), z.null()]).optional(),
  staffKind: z.enum(["RECEPTION", "ASSISTANT"]).optional(),
  password: z.string().min(6).optional(),
});

async function assertOwnStaff(doctorId: string, staffUserId: string) {
  const { data } = await supabaseAdmin
    .from("User")
    .select("id, role, employerDoctorId")
    .eq("id", staffUserId)
    .maybeSingle();
  const u = data as { id?: string; role?: string; employerDoctorId?: string | null } | null;
  if (!u?.id) return null;
  if (u.employerDoctorId !== doctorId) return null;
  if (u.role !== "DOCTOR_RECEPTION" && u.role !== "DOCTOR_ASSISTANT") return null;
  return u;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    const doctorId = getSessionDoctorRecordId(session);
    if (!doctorId) {
      return NextResponse.json(
        { error: "لم يُعثر على ملف الطبيب في الجلسة — سجّل الخروج ثم الدخول مجدداً، أو أكمل إعداد الحساب." },
        { status: 403 },
      );
    }

    const { id } = await params;
    const existing = await assertOwnStaff(doctorId, id);
    if (!existing) {
      return NextResponse.json({ error: "غير موجود" }, { status: 404 });
    }

    const body = await req.json();
    const data = patchSchema.parse(body);

    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name.trim();
    if (data.phone !== undefined) {
      const raw = data.phone == null ? "" : String(data.phone).trim();
      if (!raw) {
        update.phone = null;
      } else {
        const phoneDigits = raw.replace(/\D/g, "");
        const normalizedPhone = phoneDigits.slice(-9);
        const canonicalPhone = normalizedPhone.startsWith("0") ? normalizedPhone : "0" + normalizedPhone;
        update.phone = canonicalPhone;
      }
    }
    if (data.salaryMonthly !== undefined) {
      update.salaryMonthly = data.salaryMonthly;
    }
    if (data.staffKind !== undefined) {
      const role = data.staffKind === "ASSISTANT" ? "DOCTOR_ASSISTANT" : "DOCTOR_RECEPTION";
      const staffRole = data.staffKind === "ASSISTANT" ? "ASSISTANT" : "RECEPTION";
      update.role = role;
      update.doctorStaffRole = staffRole;
    }

    if (Object.keys(update).length > 0) {
      const { error: uErr } = await supabaseAdmin.from("User").update(update).eq("id", id);
      if (uErr) {
        console.error(uErr);
        return NextResponse.json({ error: "تعذر التحديث" }, { status: 500 });
      }
    }

    if (data.password) {
      const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(id, { password: data.password });
      if (pwErr) {
        console.error(pwErr);
        return NextResponse.json({ error: pwErr.message ?? "تعذر تحديث كلمة المرور" }, { status: 400 });
      }
    }

    const { data: row } = await supabaseAdmin
      .from("User")
      .select("id, name, email, phone, role, salaryMonthly, doctorStaffRole, createdAt")
      .eq("id", id)
      .single();

    return NextResponse.json({ staff: row, message: "تم التحديث" });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة", details: e.issues }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    const doctorId = getSessionDoctorRecordId(session);
    if (!doctorId) {
      return NextResponse.json(
        { error: "لم يُعثر على ملف الطبيب في الجلسة — سجّل الخروج ثم الدخول مجدداً، أو أكمل إعداد الحساب." },
        { status: 403 },
      );
    }

    const { id } = await params;
    if (id === session.user.id) {
      return NextResponse.json({ error: "لا يمكنك حذف حسابك الحالي" }, { status: 400 });
    }

    const existing = await assertOwnStaff(doctorId, id);
    if (!existing) {
      return NextResponse.json({ error: "غير موجود" }, { status: 404 });
    }

    const { error: upErr } = await supabaseAdmin
      .from("User")
      .update({
        role: "PATIENT",
        employerDoctorId: null,
        doctorStaffRole: null,
        salaryMonthly: null,
      })
      .eq("id", id);

    if (upErr) {
      console.error(upErr);
      return NextResponse.json({ error: "فشل تحديث الحساب" }, { status: 500 });
    }

    await supabaseAdmin.auth.admin.updateUserById(id, {
      user_metadata: { role: "PATIENT" },
    });

    return NextResponse.json({ message: "تم إلغاء ربط الموظف بالعيادة" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
