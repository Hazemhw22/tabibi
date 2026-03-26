import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const itemSchema = z.object({
  toothNumber: z.number().int().min(1).max(32),
  problemType: z.string().min(1),
  note: z.string().optional(),
  isDone: z.boolean().optional(),
  price: z.number().min(0).optional(),
});

const bodySchema = z.object({
  items: z.array(itemSchema),
  chargeToBalance: z.boolean().optional(), // إضافة الأسعار للرصيد كخدمة
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

  // تحقّق أن المريض يخص هذا الطبيب
  const { data: doctor } = await supabaseAdmin
    .from("Doctor")
    .select("id")
    .eq("userId", session.user.id)
    .single();

  if (!doctor) {
    return NextResponse.json({ items: [] });
  }

  const { data: clinicPatient } = await supabaseAdmin
    .from("ClinicPatient")
    .select("id, doctorId")
    .eq("id", id)
    .or(`doctorId.eq.${doctor.id},doctorId.eq.${session.user.id}`)
    .maybeSingle();

  if (!clinicPatient) {
    return NextResponse.json({ items: [] });
  }

  const { data, error } = await supabaseAdmin
    .from("DentalToothPlan")
    .select("toothNumber, problemType, note, isDone, price, chargedToBalance")
    .eq("clinicPatientId", id)
    .order("toothNumber", { ascending: true });

  if (error) {
    console.error("DentalToothPlan GET error:", error);
    return NextResponse.json({ items: [] });
  }

  return NextResponse.json({ items: data ?? [] });
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
    const json = await req.json();
    const { items, chargeToBalance } = bodySchema.parse(json);

    const { data: doctor } = await supabaseAdmin
      .from("Doctor")
      .select("id")
      .eq("userId", session.user.id)
      .single();

    if (!doctor) {
      return NextResponse.json({ error: "الطبيب غير موجود" }, { status: 404 });
    }

    const { data: clinicPatient } = await supabaseAdmin
      .from("ClinicPatient")
      .select("id, doctorId")
      .eq("id", id)
      .or(`doctorId.eq.${doctor.id},doctorId.eq.${session.user.id}`)
      .maybeSingle();

    if (!clinicPatient) {
      return NextResponse.json({ error: "المريض غير موجود أو غير مصرح" }, { status: 404 });
    }

    // جلب الخطة القديمة + المعاملات الموجودة لتجنب الخصم المزدوج
    const [{ data: oldPlan }, { data: existingTx }] = await Promise.all([
      supabaseAdmin
        .from("DentalToothPlan")
        .select("toothNumber, price, chargedToBalance")
        .eq("clinicPatientId", id),
      supabaseAdmin
        .from("ClinicTransaction")
        .select("description, amount")
        .eq("clinicPatientId", id)
        .eq("type", "SERVICE"),
    ]);

    const alreadyChargedDescs = new Set(
      (existingTx ?? []).map((t: { description?: string; amount?: number }) => `${t.description ?? ""}:${t.amount ?? 0}`),
    );
    const oldCharged = new Map<string, boolean>();
    for (const row of oldPlan ?? []) {
      const key = `${row.toothNumber}:${Number(row.price) || 0}`;
      if ((row as { chargedToBalance?: boolean }).chargedToBalance) {
        oldCharged.set(key, true);
      }
    }

    // احذف الخطة القديمة
    const { error: delError } = await supabaseAdmin
      .from("DentalToothPlan")
      .delete()
      .eq("clinicPatientId", id);

    if (delError) {
      const delErrMsg = (delError as { message?: string }).message ?? JSON.stringify(delError);
      console.error("DentalToothPlan delete error:", delErrMsg);
      return NextResponse.json(
        {
          error: "فشل حفظ المخطط",
          detail: process.env.NODE_ENV === "development" ? delErrMsg : undefined,
        },
        { status: 500 },
      );
    }

    if (items.length === 0) {
      return NextResponse.json({ ok: true, items: [] });
    }

    const payload = items.map((item) => {
      const price = item.price ?? 0;
      const key = `${item.toothNumber}:${price}`;
      const alreadyCharged = oldCharged.get(key) ?? false;
      return {
        clinicPatientId: id,
        toothNumber: item.toothNumber,
        problemType: item.problemType,
        note: item.note ?? null,
        isDone: item.isDone ?? false,
        price,
        chargedToBalance: alreadyCharged,
      };
    });

    const { data, error } = await supabaseAdmin
      .from("DentalToothPlan")
      .insert(payload)
      .select("toothNumber, problemType, note, isDone, price")
      .order("toothNumber", { ascending: true });

    if (error) {
      const errMsg = (error as { message?: string }).message ?? JSON.stringify(error);
      console.error("DentalToothPlan insert error:", errMsg);
      return NextResponse.json(
        {
          error: "فشل حفظ المخطط",
          detail: process.env.NODE_ENV === "development" ? errMsg : undefined,
        },
        { status: 500 },
      );
    }

    // إضافة معاملات الخدمة للأسنان الجديدة فقط (لم تُخصم مسبقاً)
    if (chargeToBalance) {
      const problemLabels: Record<string, string> = {
        FILLING: "حشوة", RCT: "عصب", CROWN: "تاج", IMPLANT: "زرعة",
        EXTRACTION: "خلع", ORTHO: "تقويم", BLEACHING: "تبييض", SCALING: "تنظيف",
      };
      for (const item of items) {
        const price = Number(item.price) || 0;
        if (price <= 0) continue;
        const key = `${item.toothNumber}:${price}`;
        if (oldCharged.get(key)) continue;
        const label = item.problemType?.startsWith("OTHER:")
          ? (item.note || item.problemType.replace("OTHER:", ""))
          : (problemLabels[item.problemType] ?? item.problemType);
        const desc = `سن ${item.toothNumber} - ${label}`;
        const negativeAmount = -Math.abs(price);
        const chargeKeyNegative = `${desc}:${negativeAmount}`;
        const chargeKeyLegacyPositive = `${desc}:${price}`;
        if (alreadyChargedDescs.has(chargeKeyNegative) || alreadyChargedDescs.has(chargeKeyLegacyPositive)) continue;
        await supabaseAdmin.from("ClinicTransaction").insert({
          clinicPatientId: id,
          type: "SERVICE",
          description: desc,
          amount: negativeAmount,
          createdBy: session.user.id,
        });
        alreadyChargedDescs.add(chargeKeyNegative);
        await supabaseAdmin
          .from("DentalToothPlan")
          .update({ chargedToBalance: true })
          .eq("clinicPatientId", id)
          .eq("toothNumber", item.toothNumber);
      }
    }

    return NextResponse.json({ ok: true, items: data ?? [] }, { status: 200 });
  } catch (err) {
    console.error("DentalToothPlan POST error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

