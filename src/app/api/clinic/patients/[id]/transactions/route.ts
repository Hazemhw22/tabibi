import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendSms, buildTransactionSmsMessage } from "@/lib/sms";
import { sendTransactionEmail } from "@/lib/email";
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
      return NextResponse.json(
        { error: "جلسة منتهية أو غير صالحة. سجّل الدخول مرة أخرى." },
        { status: 401 }
      );
    if (session.user.role !== "DOCTOR")
      return NextResponse.json({ error: "غير مصرح لهذا الإجراء" }, { status: 403 });

    const { id } = await params;
    const { data: doctor } = await supabaseAdmin
      .from("Doctor")
      .select("id")
      .eq("userId", session.user.id)
      .single();
    if (!doctor) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

    const { data: patient } = await supabaseAdmin
      .from("ClinicPatient")
      .select("id, doctorId, phone, email, userId, name")
      .eq("id", id)
      .single();
    if (!patient || patient.doctorId !== doctor.id)
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    const body = await req.json();
    const data = schema.parse(body);

    const { data: transaction, error } = await supabaseAdmin
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

    if (error) {
      console.error("ClinicTransaction insert error:", error);
      return NextResponse.json({ error: "فشل إضافة المعاملة" }, { status: 500 });
    }

    let smsSent: boolean | null = null;
    const phone = patient?.phone ?? (patient as { phone?: string })?.phone;
    if (phone) {
      const msg = buildTransactionSmsMessage({
        type: data.type,
        amount: data.amount,
        description: data.description,
        doctorName: session.user.name ?? undefined,
      });
      smsSent = await sendSms(phone, msg);
    } else {
      console.warn("[SMS] لا يوجد رقم هاتف للمريض (ClinicPatient.id =", id, ")");
    }

    // إرسال بريد إذا كان للمريض بريد إلكتروني (من ClinicPatient أو من User المرتبط)
    let email: string | null = patient?.email ?? null;
    if (!email && patient?.userId) {
      const { data: patientUser } = await supabaseAdmin
        .from("User")
        .select("email")
        .eq("id", patient.userId)
        .maybeSingle();
      email = patientUser?.email ?? null;
    }
    if (email) {
      await sendTransactionEmail({
        to: email,
        type: data.type,
        amount: data.amount,
        description: data.description,
        doctorName: session.user.name,
      });
    } else {
      console.warn("[EMAIL] لا يوجد بريد إلكتروني للمريض (ClinicPatient.id =", id, ")");
    }

    return NextResponse.json({ transaction, smsSent }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
