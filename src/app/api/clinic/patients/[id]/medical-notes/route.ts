import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { z } from "zod";

const bodySchema = z.object({
  allergies: z.string().optional(),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
  if (!doctor) return NextResponse.json({ notes: [] });

  // تأكيد أن المريض يخص هذا الطبيب
  const { data: clinicPatient } = await supabaseAdmin
    .from("ClinicPatient")
    .select("id, doctorId")
    .eq("id", id)
    // نقبل سجلات doctorId القديمة (userId) أو Doctor.id
    .or(`doctorId.eq.${doctor.id},doctorId.eq.${session.user.id}`)
    .maybeSingle();

  if (!clinicPatient) return NextResponse.json({ notes: [] });

  const { data, error } = await supabaseAdmin
    .from("ClinicMedicalNote")
    .select("id, allergies, diagnosis, treatment, createdAt, updatedAt")
    .eq("clinicPatientId", id)
    .eq("doctorId", doctor.id)
    .order("createdAt", { ascending: false });

  if (error) {
    console.error("ClinicMedicalNote list error:", error);
    return NextResponse.json({ notes: [] });
  }

  return NextResponse.json({ notes: data ?? [] });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const data = bodySchema.parse(body);

    const { data: doctor } = await supabaseAdmin
      .from("Doctor")
      .select("id")
      .eq("userId", session.user.id)
      .single();
    if (!doctor) return NextResponse.json({ error: "الطبيب غير موجود" }, { status: 404 });

    const { data: clinicPatient } = await supabaseAdmin
      .from("ClinicPatient")
      .select("id, doctorId")
      .eq("id", id)
      // نقبل سجلات doctorId القديمة (userId) أو Doctor.id
      .or(`doctorId.eq.${doctor.id},doctorId.eq.${session.user.id}`)
      .maybeSingle();

    if (!clinicPatient) {
      return NextResponse.json({ error: "المريض غير موجود أو غير مصرح" }, { status: 404 });
    }

    const { data: note, error } = await supabaseAdmin
      .from("ClinicMedicalNote")
      .insert({
        doctorId: doctor.id,
        clinicPatientId: id,
        allergies: data.allergies || null,
        diagnosis: data.diagnosis || null,
        treatment: data.treatment || null,
      })
      .select("id, allergies, diagnosis, treatment, createdAt, updatedAt")
      .single();

    if (error) {
      console.error("ClinicMedicalNote insert error:", error);
      return NextResponse.json({ error: "فشل إضافة الملاحظة الطبية" }, { status: 500 });
    }

    return NextResponse.json({ note }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

