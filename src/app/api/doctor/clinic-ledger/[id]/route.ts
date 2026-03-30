import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionDoctorRecordId } from "@/lib/doctor-api-scope";

const patchSchema = z.object({
  kind: z.enum(["CLINIC_PURCHASE", "SALARY_PAYMENT"]),
  title: z.string().min(1),
  amount: z.number().positive(),
  occurredAt: z.string().optional(),
  notes: z.string().optional().nullable(),
  staffUserId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
});

async function assertOwnSupplier(doctorId: string, supplierId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("DoctorClinicSupplier")
    .select("id")
    .eq("id", supplierId)
    .eq("doctorId", doctorId)
    .maybeSingle();
  return Boolean(data?.id);
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

    const body = await req.json();
    const data = patchSchema.parse(body);

    if (data.kind === "CLINIC_PURCHASE" && data.supplierId) {
      if (!(await assertOwnSupplier(doctorId, data.supplierId))) {
        return NextResponse.json({ error: "المزوّد غير مرتبط بعيادتك" }, { status: 400 });
      }
    }
    if (data.kind === "SALARY_PAYMENT" && data.supplierId) {
      return NextResponse.json({ error: "دفعة الراتب لا ترتبط بمزوّد" }, { status: 400 });
    }

    if (data.kind === "SALARY_PAYMENT" && data.staffUserId) {
      const { data: staff } = await supabaseAdmin
        .from("User")
        .select("id, employerDoctorId")
        .eq("id", data.staffUserId)
        .single();
      if (!staff || staff.employerDoctorId !== doctorId) {
        return NextResponse.json({ error: "الموظف غير مرتبط بعيادتك" }, { status: 400 });
      }
    }

    const occurredAt = data.occurredAt ? new Date(data.occurredAt).toISOString() : new Date().toISOString();

    const update = {
      kind: data.kind,
      title: data.title.trim(),
      amount: data.amount,
      occurredAt,
      notes: data.notes?.trim() ? data.notes.trim() : null,
      staffUserId: data.kind === "SALARY_PAYMENT" ? data.staffUserId ?? null : null,
      supplierId: data.kind === "CLINIC_PURCHASE" && data.supplierId ? data.supplierId : null,
    };

    const { data: updatedRows, error } = await supabaseAdmin
      .from("DoctorClinicLedger")
      .update(update)
      .eq("id", id)
      .eq("doctorId", doctorId)
      .select("id");

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "تعذر التحديث" }, { status: 500 });
    }
    if (!updatedRows?.length) {
      return NextResponse.json({ error: "غير موجود" }, { status: 404 });
    }

    return NextResponse.json({ message: "تم التحديث" });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
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

    const { data: deletedRows, error } = await supabaseAdmin
      .from("DoctorClinicLedger")
      .delete()
      .eq("id", id)
      .eq("doctorId", doctorId)
      .select("id");

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "تعذر الحذف" }, { status: 500 });
    }
    if (!deletedRows?.length) {
      return NextResponse.json({ error: "غير موجود" }, { status: 404 });
    }

    return NextResponse.json({ message: "تم الحذف" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
