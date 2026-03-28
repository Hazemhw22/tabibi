import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionDoctorRecordId } from "@/lib/doctor-api-scope";

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  companyName: z.union([z.string(), z.null()]).optional(),
  phone: z.union([z.string(), z.null()]).optional(),
  email: z.union([z.string().email(), z.literal(""), z.null()]).optional(),
  notes: z.union([z.string(), z.null()]).optional(),
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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    const doctorId = getSessionDoctorRecordId(session);
    if (!doctorId) return NextResponse.json({ error: "لم يُعثر على الطبيب" }, { status: 403 });

    const { id } = await params;
    if (!(await assertOwnSupplier(doctorId, id))) {
      return NextResponse.json({ error: "غير موجود" }, { status: 404 });
    }

    const { data: supplier, error: supErr } = await supabaseAdmin
      .from("DoctorClinicSupplier")
      .select("id, name, companyName, phone, email, notes, createdAt, updatedAt")
      .eq("id", id)
      .single();

    if (supErr || !supplier) {
      console.error(supErr);
      return NextResponse.json({ error: "تعذر التحميل" }, { status: 500 });
    }

    const { data: entries, error: ledErr } = await supabaseAdmin
      .from("DoctorClinicLedger")
      .select("id, kind, title, amount, occurredAt, notes, supplierId")
      .eq("doctorId", doctorId)
      .eq("supplierId", id)
      .eq("kind", "CLINIC_PURCHASE")
      .order("occurredAt", { ascending: false })
      .limit(500);

    if (ledErr) {
      console.error(ledErr);
      return NextResponse.json({ error: "تعذر التحميل" }, { status: 500 });
    }

    const list = entries ?? [];
    const totalPurchases = list.reduce((s, r) => s + Number(r.amount ?? 0), 0);

    return NextResponse.json({ supplier, entries: list, totalPurchases });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    const doctorId = getSessionDoctorRecordId(session);
    if (!doctorId) return NextResponse.json({ error: "لم يُعثر على الطبيب" }, { status: 403 });

    const { id } = await params;
    if (!(await assertOwnSupplier(doctorId, id))) {
      return NextResponse.json({ error: "غير موجود" }, { status: 404 });
    }

    const body = await req.json();
    const data = patchSchema.parse(body);
    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (data.name !== undefined) update.name = data.name.trim();
    if (data.companyName !== undefined) update.companyName = data.companyName?.trim() || null;
    if (data.phone !== undefined) update.phone = data.phone?.trim() || null;
    if (data.email !== undefined) {
      update.email = data.email && String(data.email).trim() ? String(data.email).trim().toLowerCase() : null;
    }
    if (data.notes !== undefined) update.notes = data.notes?.trim() || null;

    const { data: updated, error } = await supabaseAdmin
      .from("DoctorClinicSupplier")
      .update(update)
      .eq("id", id)
      .select("id, name, companyName, phone, email, notes, createdAt, updatedAt")
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "تعذر التحديث" }, { status: 500 });
    }
    return NextResponse.json({ supplier: updated });
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
    if (!doctorId) return NextResponse.json({ error: "لم يُعثر على الطبيب" }, { status: 403 });

    const { id } = await params;
    if (!(await assertOwnSupplier(doctorId, id))) {
      return NextResponse.json({ error: "غير موجود" }, { status: 404 });
    }

    const { error } = await supabaseAdmin.from("DoctorClinicSupplier").delete().eq("id", id);
    if (error) {
      console.error(error);
      return NextResponse.json({ error: "تعذر الحذف" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
