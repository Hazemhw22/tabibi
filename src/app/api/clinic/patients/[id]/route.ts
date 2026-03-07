import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  bloodType: z.string().optional(),
  allergies: z.string().optional(),
  notes: z.string().optional(),
  fileNumber: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { id } = await params;

    const { data: doctor } = await supabaseAdmin
      .from("Doctor")
      .select("id")
      .eq("userId", session.user.id)
      .single();
    if (!doctor) return NextResponse.json({ error: "الطبيب غير موجود" }, { status: 404 });

    const { data: existing } = await supabaseAdmin
      .from("ClinicPatient")
      .select("id")
      .eq("id", id)
      .eq("doctorId", doctor.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "المريض غير موجود أو غير مصرح" }, { status: 404 });
    }

    const body = await req.json();
    const data = schema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.whatsapp !== undefined) updateData.whatsapp = data.whatsapp || null;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.gender !== undefined) updateData.gender = data.gender || null;
    if (data.dateOfBirth !== undefined) updateData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth).toISOString() : null;
    if (data.address !== undefined) updateData.address = data.address || null;
    if (data.bloodType !== undefined) updateData.bloodType = data.bloodType || null;
    if (data.allergies !== undefined) updateData.allergies = data.allergies || null;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.fileNumber !== undefined) updateData.fileNumber = data.fileNumber || null;

    const { data: patient, error } = await supabaseAdmin
      .from("ClinicPatient")
      .update(updateData)
      .eq("id", id)
      .select("id, name, whatsapp, email, fileNumber")
      .single();

    if (error) {
      console.error("ClinicPatient update error:", error);
      return NextResponse.json({ error: "فشل تحديث المريض" }, { status: 500 });
    }

    return NextResponse.json({ patient }, { status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
