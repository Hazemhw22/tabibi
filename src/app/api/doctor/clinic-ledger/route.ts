import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionDoctorRecordId } from "@/lib/doctor-api-scope";

const postSchema = z.object({
  kind: z.enum(["CLINIC_PURCHASE", "SALARY_PAYMENT"]),
  title: z.string().min(1),
  amount: z.number().positive(),
  occurredAt: z.string().optional(),
  notes: z.string().optional(),
  staffUserId: z.string().optional(),
  supplierId: z.string().optional(),
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

/** مصروفات العيادة ودفعات رواتب — سلبي على حساب الطبيب (تُخزَّن كمبالغ موجبة). */
export async function GET() {
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

    const { data, error } = await supabaseAdmin
      .from("DoctorClinicLedger")
      .select(
        `
        *,
        DoctorClinicSupplier (
          id,
          name,
          companyName
        )
      `,
      )
      .eq("doctorId", doctorId)
      .order("occurredAt", { ascending: false })
      .limit(500);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "تعذر التحميل" }, { status: 500 });
    }

    const raw = data ?? [];
    type RowOut = Record<string, unknown> & {
      amount?: number;
      supplier: { id: string; name?: string; companyName?: string | null } | null;
    };
    const rows: RowOut[] = raw.map((r: Record<string, unknown>) => {
      const sup = r.DoctorClinicSupplier as { id: string; name?: string; companyName?: string | null } | null | undefined;
      const { DoctorClinicSupplier: _drop, ...rest } = r;
      return { ...rest, supplier: sup ?? null } as RowOut;
    });
    const totalOut = rows.reduce((s, r) => s + (r.amount ?? 0), 0);

    return NextResponse.json({ entries: rows, totalOut });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function POST(req: Request) {
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

    const body = await req.json();
    const data = postSchema.parse(body);

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

    const { data: row, error } = await supabaseAdmin
      .from("DoctorClinicLedger")
      .insert({
        id: randomUUID(),
        doctorId,
        kind: data.kind,
        title: data.title.trim(),
        amount: data.amount,
        occurredAt,
        notes: data.notes?.trim() || null,
        staffUserId: data.kind === "SALARY_PAYMENT" ? data.staffUserId ?? null : null,
        supplierId:
          data.kind === "CLINIC_PURCHASE" && data.supplierId ? data.supplierId : null,
      })
      .select("id")
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "فشل الحفظ — تأكد من ترحيل قاعدة البيانات" }, { status: 500 });
    }

    return NextResponse.json({ id: row?.id, message: "تم التسجيل" }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
