import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendSms, buildTransactionSmsMessage } from "@/lib/sms";
import { sendTransactionEmail } from "@/lib/email";
import { notifyClinicTransaction } from "@/lib/notifications";
import { z } from "zod";

const schema = z.object({
  type: z.enum(["SERVICE", "PAYMENT"]),
  description: z.string().min(1),
  amount: z.number().positive(),
  notes: z.string().optional(),
  date: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "جلسة منتهية. سجّل الدخول مرة أخرى." }, { status: 401 });
    if (session.user.role !== "DOCTOR")
      return NextResponse.json({ error: "غير مصرح لهذا الإجراء" }, { status: 403 });

    const { id } = await params;

    /* ── جلب Doctor record ─────────────────────────────────── */
    const { data: doctor } = await supabaseAdmin
      .from("Doctor")
      .select("id")
      .eq("userId", session.user.id)
      .single();
    if (!doctor) return NextResponse.json({ error: "الطبيب غير موجود" }, { status: 404 });

    /* ── جلب المريض — نقبل doctorId = Doctor.id أو doctorId = userId
         (لأن بعض السجلات القديمة خُزّنت بـ userId بدل Doctor.id) ─── */
    const { data: patient } = await supabaseAdmin
      .from("ClinicPatient")
      .select("id, doctorId, phone, email, userId, name")
      .eq("id", id)
      .or(`doctorId.eq.${doctor.id},doctorId.eq.${session.user.id}`)
      .single();

    if (!patient)
      return NextResponse.json({ error: "المريض غير موجود أو غير مصرح" }, { status: 403 });

    /* ── Parse body ─────────────────────────────────────────── */
    const body = await req.json();
    const data = schema.parse(body);

    /* ── Insert transaction ─────────────────────────────────── */
    const { data: transaction, error: txError } = await supabaseAdmin
      .from("ClinicTransaction")
      .insert({
        clinicPatientId: id,
        type: data.type,
        description: data.description,
        amount: data.amount,
        notes: data.notes ?? null,
        date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
        createdBy: session.user.id,
      })
      .select("id, type, description, amount, date, notes")
      .single();

    if (txError) {
      console.error("ClinicTransaction insert error:", txError);
      return NextResponse.json({ error: "فشل إضافة المعاملة" }, { status: 500 });
    }

    /* ── SMS ───────────────────────────────────────────────── */
    let smsSent: boolean | null = null;
    if (patient.phone) {
      const msg = buildTransactionSmsMessage({
        type: data.type,
        amount: data.amount,
        description: data.description,
        doctorName: session.user.name ?? undefined,
      });
      smsSent = await sendSms(patient.phone, msg);
    }

    /* ── Email ─────────────────────────────────────────────── */
    let email: string | null = patient.email ?? null;
    if (!email && patient.userId) {
      const { data: userRow } = await supabaseAdmin
        .from("User")
        .select("email")
        .eq("id", patient.userId)
        .maybeSingle();
      email = userRow?.email ?? null;
    }
    if (email) {
      await sendTransactionEmail({
        to: email,
        type: data.type,
        amount: data.amount,
        description: data.description,
        doctorName: session.user.name,
      });
    }

    /* ── Notification للطبيب دائماً + للمريض إن كان له حساب ─ */
    await notifyClinicTransaction({
      doctorUserId: session.user.id,
      patientUserId: patient.userId ?? null,
      patientName: patient.name ?? null,
      type: data.type,
      description: data.description,
      amount: data.amount,
      doctorName: session.user.name,
      patientId: id,
    });

    return NextResponse.json({ transaction, smsSent }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
