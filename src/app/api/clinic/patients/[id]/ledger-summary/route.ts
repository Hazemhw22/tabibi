import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ledgerBalance } from "@/lib/patient-transaction-math";

/**
 * ملخص مالي لمريض العيادة: الرصيد، مجموع الخدمات، مجموع الدفعات.
 * للاستخدام في SMS (كشف حساب / تحصيل).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (session.user.role !== "DOCTOR") return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    const { id } = await params;

    const { data: doctor } = await supabaseAdmin
      .from("Doctor")
      .select("id")
      .eq("userId", session.user.id)
      .single();
    if (!doctor) return NextResponse.json({ error: "الطبيب غير موجود" }, { status: 404 });

    const { data: patient } = await supabaseAdmin
      .from("ClinicPatient")
      .select("id, name")
      .eq("id", id)
      .or(`doctorId.eq.${doctor.id},doctorId.eq.${session.user.id}`)
      .maybeSingle();

    if (!patient) return NextResponse.json({ error: "المريض غير موجود" }, { status: 404 });

    const { data: rows } = await supabaseAdmin
      .from("ClinicTransaction")
      .select("type, amount")
      .eq("clinicPatientId", id);

    const list = (rows ?? []) as { type: string; amount: number | null }[];
    const balance = ledgerBalance(list);

    let totalPayments = 0;
    let totalServices = 0;
    for (const t of list) {
      if (t.type === "PAYMENT") totalPayments += Math.abs(Number(t.amount) || 0);
      if (t.type === "SERVICE") totalServices += Math.abs(Number(t.amount) || 0);
    }

    return NextResponse.json({
      patientName: (patient as { name?: string | null }).name ?? null,
      balance,
      totalPayments,
      totalServices,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
