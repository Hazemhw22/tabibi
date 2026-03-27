import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { z } from "zod";

const patchSchema = z.object({
  description: z.string().min(1).optional(),
  /** دفعات موجبة وخدمات سالبة — لا نقبل الصفر فقط */
  amount: z
    .number()
    .refine((n) => Number.isFinite(n) && n !== 0, { message: "المبلغ يجب أن يكون غير صفر" })
    .optional(),
  notes: z.string().nullable().optional(),
  date: z.string().optional(),
});

async function getDoctorIdByUserId(userId: string): Promise<string | null> {
  const { data: doctor } = await supabaseAdmin
    .from("Doctor")
    .select("id")
    .eq("userId", userId)
    .maybeSingle();
  return doctor?.id ?? null;
}

async function verifyPlatformTxOwner(txId: string, doctorId: string) {
  const { data: tx } = await supabaseAdmin
    .from("PlatformPatientTransaction")
    .select("id, doctorId, type")
    .eq("id", txId)
    .maybeSingle();

  if (!tx) return null;
  if ((tx as { doctorId?: string | null }).doctorId !== doctorId) return null;
  return tx;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const doctorId = await getDoctorIdByUserId(session.user.id);
    if (!doctorId) return NextResponse.json({ error: "الطبيب غير موجود" }, { status: 404 });

    const { id } = await params;
    const tx = await verifyPlatformTxOwner(id, doctorId);
    if (!tx) return NextResponse.json({ error: "غير موجود أو غير مصرح" }, { status: 404 });

    const body = await req.json();
    const data = patchSchema.parse(body);

    const updates: Record<string, unknown> = {};
    if (data.description !== undefined) updates.description = data.description;
    if (data.amount !== undefined) {
      const typ = (tx as { type?: string }).type;
      if (typ === "SERVICE") updates.amount = -Math.abs(data.amount);
      else if (typ === "PAYMENT") updates.amount = Math.abs(data.amount);
      else updates.amount = data.amount;
    }
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.date !== undefined) updates.date = new Date(data.date).toISOString();

    const { data: updated, error } = await supabaseAdmin
      .from("PlatformPatientTransaction")
      .update(updates)
      .eq("id", id)
      .select("id, type, description, amount, date, notes")
      .single();

    if (error) return NextResponse.json({ error: "فشل التعديل" }, { status: 500 });
    return NextResponse.json({ transaction: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const doctorId = await getDoctorIdByUserId(session.user.id);
    if (!doctorId) return NextResponse.json({ error: "الطبيب غير موجود" }, { status: 404 });

    const { id } = await params;
    const tx = await verifyPlatformTxOwner(id, doctorId);
    if (!tx) return NextResponse.json({ error: "غير موجود أو غير مصرح" }, { status: 404 });

    const { error: delErr } = await supabaseAdmin
      .from("PlatformPatientTransaction")
      .delete()
      .eq("id", id);
    if (delErr) return NextResponse.json({ error: "فشل الحذف" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
