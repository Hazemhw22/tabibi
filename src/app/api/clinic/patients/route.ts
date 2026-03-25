import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { linkClinicPatientAndSendPasswordSetup } from "@/lib/clinic-patient-invite";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
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

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { data: doctor } = await supabaseAdmin
      .from("Doctor")
      .select("id")
      .eq("userId", session.user.id)
      .single();
    if (!doctor) return NextResponse.json({ error: "الطبيب غير موجود" }, { status: 404 });

    const body = await req.json();
    const data = schema.parse(body);

    const { data: patient, error } = await supabaseAdmin
      .from("ClinicPatient")
      .insert({
        doctorId: doctor.id,
        name: data.name,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        email: data.email || null,
        gender: data.gender || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString() : null,
        address: data.address || null,
        bloodType: data.bloodType || null,
        allergies: data.allergies || null,
        notes: data.notes || null,
        fileNumber: data.fileNumber || null,
      })
      .select("id, name, phone, whatsapp, email, fileNumber, userId")
      .single();

    if (error) {
      console.error("ClinicPatient insert error:", error);
      return NextResponse.json({ error: "فشل إضافة المريض. تأكد من وجود جدول ClinicPatient." }, { status: 500 });
    }

    const phoneRaw = (data.whatsapp || data.phone || "").trim();
    let setupSmsSent: boolean | null = null;
    let mergedPatient = patient;
    if (phoneRaw.replace(/\D/g, "").length >= 9) {
      const invite = await linkClinicPatientAndSendPasswordSetup({
        clinicPatientId: patient.id,
        patientName: data.name,
        phoneRaw,
      });
      setupSmsSent = invite.setupSmsSent;
      if (invite.userId) {
        mergedPatient = { ...patient, userId: invite.userId };
      }
    }

    return NextResponse.json({ patient: mergedPatient, setupSmsSent }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { data: doctor } = await supabaseAdmin
      .from("Doctor")
      .select("id")
      .eq("userId", session.user.id)
      .single();
    if (!doctor) return NextResponse.json({ patients: [] });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    let query = supabaseAdmin
      .from("ClinicPatient")
      .select("id, name, phone, whatsapp, email, fileNumber, createdAt")
      .eq("doctorId", doctor.id)
      .eq("isActive", true)
      .order("createdAt", { ascending: false });

    if (q) {
      query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
    }

    const { data: patients, error } = await query;

    if (error) {
      console.error("ClinicPatient get error:", error);
      return NextResponse.json({ patients: [] });
    }

    return NextResponse.json({ patients: patients ?? [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
