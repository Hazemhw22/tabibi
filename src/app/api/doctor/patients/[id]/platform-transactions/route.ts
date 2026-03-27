import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendSms, buildTransactionSmsMessage } from "@/lib/sms";
import { sendTransactionEmail } from "@/lib/email";
import { notifyClinicTransaction } from "@/lib/notifications";
import { z } from "zod";
import { ledgerBalance } from "@/lib/patient-transaction-math";

const schema = z.object({
  type: z.enum(["SERVICE", "PAYMENT"]),
  description: z.string().min(1),
  amount: z.number().positive(),
  notes: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DOCTOR")
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    const { id: patientId } = await params;
    const { data: doctor } = await supabaseAdmin
      .from("Doctor")
      .select("id")
      .eq("userId", session.user.id)
      .single();
    if (!doctor) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

    const { data: rows } = await supabaseAdmin
      .from("PlatformPatientTransaction")
      .select("id, type, description, amount, date, notes")
      .eq("doctorId", doctor.id)
      .eq("patientId", patientId)
      .order("date", { ascending: false });

    return NextResponse.json(rows ?? []);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DOCTOR")
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    const { id: patientId } = await params;
    const { data: doctor } = await supabaseAdmin
      .from("Doctor")
      .select("id")
      .eq("userId", session.user.id)
      .single();
    if (!doctor) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

    const { data: hasAppointment } = await supabaseAdmin
      .from("Appointment")
      .select("id")
      .eq("doctorId", doctor.id)
      .eq("patientId", patientId)
      .limit(1);
    if (!hasAppointment?.length)
      return NextResponse.json({ error: "هذا المريض غير مرتبط بمواعيد عندك" }, { status: 403 });

    const body = await req.json();
    const data = schema.parse(body);

    const amountStored =
      data.type === "SERVICE" ? -Math.abs(data.amount) : Math.abs(data.amount);

    const { data: row, error } = await supabaseAdmin
      .from("PlatformPatientTransaction")
      .insert({
        doctorId: doctor.id,
        patientId,
        type: data.type,
        description: data.description,
        amount: amountStored,
        notes: data.notes ?? null,
      })
      .select("id, type, description, amount, date, notes")
      .single();

    if (error) {
      console.error("PlatformPatientTransaction insert:", error);
      return NextResponse.json({ error: "فشل إضافة المعاملة" }, { status: 500 });
    }

    /* ── حساب الرصيد بعد المعاملة (للدفعات) ───────────────────── */
    let balanceAfter: number | undefined;
    if (data.type === "PAYMENT") {
      const { data: allTx } = await supabaseAdmin
        .from("PlatformPatientTransaction")
        .select("type, amount")
        .eq("doctorId", doctor.id)
        .eq("patientId", patientId);
      balanceAfter = ledgerBalance(allTx ?? []);
    }

    let smsSent: boolean | null = null;
    const { data: patientUser } = await supabaseAdmin
      .from("User")
      .select("id, name, phone, email")
      .eq("id", patientId)
      .single();
    const phone = patientUser?.phone ?? (patientUser as { phone?: string })?.phone;
    if (phone) {
      const msg = buildTransactionSmsMessage({
        type: data.type,
        amount: Math.abs(data.amount),
        description: data.description,
        doctorName: session.user.name ?? undefined,
        balanceAfter,
      });
      smsSent = await sendSms(phone, msg);
    } else {
      console.warn("[SMS] لا يوجد رقم هاتف للمريض (User.id =", patientId, ")");
    }

    // إرسال بريد إذا كان للمريض بريد إلكتروني
    const email = patientUser?.email ?? (patientUser as { email?: string })?.email ?? null;
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

    /* ── إشعار للطبيب والمريض ───────────────────────────────── */
    await notifyClinicTransaction({
      doctorUserId:   session.user.id,
      patientUserId: patientId,
      patientEmail:  patientUser?.email ?? null,
      patientPhone:  patientUser?.phone ?? null,
      patientName:   patientUser?.name ?? null,
      type:          data.type,
      description:   data.description,
      amount:        Math.abs(data.amount),
      doctorName:    session.user.name,
      patientId,
      patientSource: "platform",
    });

    return NextResponse.json({ ...row, smsSent }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
