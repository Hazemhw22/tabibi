import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { z } from "zod";

const bodySchema = z.object({
  allergies: z.string().optional(),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { noteId } = await params;
    const body = await req.json();
    const data = bodySchema.parse(body);

    const { data: doctor } = await supabaseAdmin
      .from("Doctor")
      .select("id")
      .eq("userId", session.user.id)
      .single();
    if (!doctor) return NextResponse.json({ error: "الطبيب غير موجود" }, { status: 404 });

    // تأكيد ملكية الملاحظة
    const { data: existing } = await supabaseAdmin
      .from("ClinicMedicalNote")
      .select("id, doctorId")
      .eq("id", noteId)
      .eq("doctorId", doctor.id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "الملاحظة غير موجودة أو غير مصرح" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (data.allergies !== undefined) updateData.allergies = data.allergies || null;
    if (data.diagnosis !== undefined) updateData.diagnosis = data.diagnosis || null;
    if (data.treatment !== undefined) updateData.treatment = data.treatment || null;

    const { data: note, error } = await supabaseAdmin
      .from("ClinicMedicalNote")
      .update(updateData)
      .eq("id", noteId)
      .select("id, allergies, diagnosis, treatment, createdAt, updatedAt")
      .single();

    if (error) {
      console.error("ClinicMedicalNote update error:", error);
      return NextResponse.json({ error: "فشل تحديث الملاحظة الطبية" }, { status: 500 });
    }

    return NextResponse.json({ note }, { status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "DOCTOR") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { noteId } = await params;

  const { data: doctor } = await supabaseAdmin
    .from("Doctor")
    .select("id")
    .eq("userId", session.user.id)
    .single();
  if (!doctor) return NextResponse.json({ error: "الطبيب غير موجود" }, { status: 404 });

  const { data: existing } = await supabaseAdmin
    .from("ClinicMedicalNote")
    .select("id, doctorId")
    .eq("id", noteId)
    .eq("doctorId", doctor.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "الملاحظة غير موجودة أو غير مصرح" }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("ClinicMedicalNote")
    .delete()
    .eq("id", noteId);

  if (error) {
    console.error("ClinicMedicalNote delete error:", error);
    return NextResponse.json({ error: "فشل حذف الملاحظة" }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

