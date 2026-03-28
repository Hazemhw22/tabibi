import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionDoctorRecordId } from "@/lib/doctor-api-scope";

const createSchema = z.object({
  name: z.string().min(2),
  companyName: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    const doctorId = getSessionDoctorRecordId(session);
    if (!doctorId) return NextResponse.json({ error: "لم يُعثر على الطبيب" }, { status: 404 });

    const { data, error } = await supabaseAdmin
      .from("DoctorClinicSupplier")
      .select("id, name, companyName, phone, email, notes, createdAt, updatedAt")
      .eq("doctorId", doctorId)
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "تعذر التحميل" }, { status: 500 });
    }

    const suppliers = data ?? [];
    const { data: ledgerRows } = await supabaseAdmin
      .from("DoctorClinicLedger")
      .select("supplierId, amount")
      .eq("doctorId", doctorId)
      .eq("kind", "CLINIC_PURCHASE")
      .not("supplierId", "is", null);

    const totals = new Map<string, number>();
    for (const row of ledgerRows ?? []) {
      const sid = row.supplierId as string | undefined;
      if (!sid) continue;
      totals.set(sid, (totals.get(sid) ?? 0) + Number(row.amount ?? 0));
    }

    const withTotals = suppliers.map((s) => ({
      ...s,
      totalPurchases: totals.get(s.id) ?? 0,
    }));

    return NextResponse.json({ suppliers: withTotals });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    const doctorId = getSessionDoctorRecordId(session);
    if (!doctorId) {
      return NextResponse.json({ error: "لم يُعثر على ملف الطبيب" }, { status: 403 });
    }

    const body = await req.json();
    const data = createSchema.parse(body);
    const email = data.email?.trim() ? data.email.trim().toLowerCase() : null;
    const now = new Date().toISOString();
    const id = randomUUID();

    const { data: inserted, error } = await supabaseAdmin
      .from("DoctorClinicSupplier")
      .insert({
        id,
        doctorId,
        name: data.name.trim(),
        companyName: data.companyName?.trim() || null,
        phone: data.phone?.trim() || null,
        email,
        notes: data.notes?.trim() || null,
        createdAt: now,
        updatedAt: now,
      })
      .select("id, name, companyName, phone, email, notes, createdAt, updatedAt")
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "تعذر الحفظ" }, { status: 500 });
    }

    return NextResponse.json({ supplier: inserted, message: "تمت إضافة المزوّد" }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة", details: e.issues }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
