import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendSms, sendWhatsApp, buildTransactionSmsMessage } from "@/lib/sms";
import { sendTransactionEmail } from "@/lib/email";
import { notifyClinicTransaction } from "@/lib/notifications";
import { z } from "zod";
import { ledgerBalance } from "@/lib/patient-transaction-math";

const schema = z.object({
  type: z.enum(["SERVICE", "PAYMENT"]),
  description: z.string().min(1),
  /** المبلغ المدخل موجباً؛ تُخزَّن الخدمة سالبة والدفعة موجبة */
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
      .select("id, doctorId, phone, email, userId, name, whatsapp")
      .eq("id", id)
      .or(`doctorId.eq.${doctor.id},doctorId.eq.${session.user.id}`)
      .single();

    if (!patient)
      return NextResponse.json({ error: "المريض غير موجود أو غير مصرح" }, { status: 403 });

    /* ── Parse body ─────────────────────────────────────────── */
    const body = await req.json();
    const data = schema.parse(body);

    const amountStored =
      data.type === "SERVICE" ? -Math.abs(data.amount) : Math.abs(data.amount);

    /* ── Insert transaction ─────────────────────────────────── */
    const { data: transaction, error: txError } = await supabaseAdmin
      .from("ClinicTransaction")
      .insert({
        clinicPatientId: id,
        type: data.type,
        description: data.description,
        amount: amountStored,
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

    /* ── حساب الرصيد بعد المعاملة (للدفعات) ───────────────────── */
    let balanceAfter: number | undefined;
    if (data.type === "PAYMENT") {
      const { data: allTx } = await supabaseAdmin
        .from("ClinicTransaction")
        .select("type, amount")
        .eq("clinicPatientId", id);
      balanceAfter = ledgerBalance(allTx ?? []);
    }

    /* ── WhatsApp / SMS ─────────────────────────────────────── */
    const msg = buildTransactionSmsMessage({
      type: data.type,
      amount: Math.abs(data.amount),
      description: data.description,
      doctorName: session.user.name ?? undefined,
      balanceAfter,
    });
    let smsSent: boolean | null = null;
    const patientWhatsapp = (patient as { whatsapp?: string | null }).whatsapp;
    if (patientWhatsapp) {
      smsSent = await sendWhatsApp(patientWhatsapp, msg);
    } else if (patient.phone) {
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
        amount: Math.abs(data.amount),
        description: data.description,
        doctorName: session.user.name,
        balanceAfter,
      });
    }

    /* ── Notification للطبيب دائماً + للمريض (يُحلَّل من email/phone إن لم يكن userId) ─ */
    if (!session.user.id) {
      console.error("[Transactions] Cannot notify: session.user.id is missing");
    } else {
      await notifyClinicTransaction({
      doctorUserId:  session.user.id,
      patientUserId: patient.userId ?? null,
      patientEmail:  patient.email ?? null,
      patientPhone:  patient.phone ?? null,
      patientName:   patient.name ?? null,
      type:          data.type,
      description:   data.description,
      amount:        Math.abs(data.amount),
      doctorName:    session.user.name,
      patientId:     id,
    });
    }

    return NextResponse.json({ transaction, smsSent }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
