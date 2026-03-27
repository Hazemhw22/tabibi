import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { z } from "zod";

const patchSchema = z.object({
  description: z.string().min(1).optional(),
  amount: z
    .number()
    .refine((n) => Number.isFinite(n) && n !== 0, { message: "المبلغ يجب أن يكون غير صفر" })
    .optional(),
  notes: z.string().nullable().optional(),
  date: z.string().optional(),
});

async function getVerifiedTx(txId: string, userId: string) {
  const { data: doctor } = await supabaseAdmin
    .from("Doctor")
    .select("id")
    .eq("userId", userId)
    .maybeSingle();
  if (!doctor) return null;

  const { data: tx, error } = await supabaseAdmin
    .from("ClinicTransaction")
    .select("id, type, clinicPatient:ClinicPatient(doctorId)")
    .eq("id", txId)
    .maybeSingle();

  if (error || !tx) return null;
  const raw = tx.clinicPatient as unknown as { doctorId?: string } | { doctorId?: string }[] | null;
  const cp = Array.isArray(raw) ? raw[0] : raw;
  const doctorId = cp?.doctorId;
  if (doctorId !== doctor.id) return null;
  return tx;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DOCTOR")
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    const { id } = await params;
    const tx = await getVerifiedTx(id, session.user.id);
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
      .from("ClinicTransaction")
      .update(updates)
      .eq("id", id)
      .select("id, type, description, amount, date, notes")
      .single();

    if (error) return NextResponse.json({ error: "فشل التعديل" }, { status: 500 });
    return NextResponse.json({ transaction: updated });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DOCTOR")
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    const { id } = await params;
    const tx = await getVerifiedTx(id, session.user.id);
    if (!tx) return NextResponse.json({ error: "غير موجود أو غير مصرح" }, { status: 404 });

    const { error: delErr } = await supabaseAdmin.from("ClinicTransaction").delete().eq("id", id);
    if (delErr) return NextResponse.json({ error: "فشل الحذف" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
