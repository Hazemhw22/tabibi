import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { assertMedicalCenterApproved } from "@/lib/medical-center-auth";

const postSchema = z.object({
  patientName: z.string().min(2),
  complaint: z.string().optional(),
  amount: z.number().nonnegative(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
  paymentStatus: z.enum(["UNPAID", "PAID"]).optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const gate = await assertMedicalCenterApproved(session.user.id);
    if (!gate.ok) return gate.response;
    const centerId = gate.centerId;

    const { data, error } = await supabaseAdmin
      .from("EmergencyVisit")
      .select("*")
      .eq("medicalCenterId", centerId)
      .order("createdAt", { ascending: false })
      .limit(200);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "تعذر التحميل" }, { status: 500 });
    }

    return NextResponse.json({ visits: data ?? [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const gate = await assertMedicalCenterApproved(session.user.id);
    if (!gate.ok) return gate.response;
    const centerId = gate.centerId;

    const body = await req.json();
    const data = postSchema.parse(body);

    const { data: row, error } = await supabaseAdmin
      .from("EmergencyVisit")
      .insert({
        medicalCenterId: centerId,
        patientName: data.patientName,
        complaint: data.complaint ?? null,
        amount: data.amount,
        paymentMethod: data.paymentMethod ?? null,
        notes: data.notes ?? null,
        paymentStatus: data.paymentStatus === "PAID" ? "PAID" : "UNPAID",
        registeredByUserId: session.user.id,
      })
      .select("id")
      .single();

    if (error || !row) {
      console.error(error);
      return NextResponse.json({ error: "فشل الحفظ" }, { status: 500 });
    }

    return NextResponse.json({ id: row.id, message: "تم تسجيل الزيارة" }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة", details: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
