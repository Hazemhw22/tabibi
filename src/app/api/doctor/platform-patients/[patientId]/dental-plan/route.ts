import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionDoctorRecordId } from "@/lib/doctor-api-scope";
import { doctorHasCareAccessToPlatformPatient } from "@/lib/doctor-platform-patient-care-access";
import { isDoctorOrStaffRole } from "@/lib/doctor-team-roles";
import { buildCarePlanNewServicesSmsMessage, sendSms } from "@/lib/sms";

const itemSchema = z.object({
  toothNumber: z.number().int().min(1).max(32),
  problemType: z.string().min(1),
  note: z.string().optional(),
  isDone: z.boolean().optional(),
  price: z.number().min(0).optional(),
});

const bodySchema = z.object({
  items: z.array(itemSchema),
  chargeToBalance: z.boolean().optional(),
});

function mapMissingTable(err: { message?: string } | null) {
  const msg = err?.message ?? "";
  if (/does not exist|relation|42P01|schema cache/i.test(msg)) {
    return NextResponse.json(
      {
        error:
          "جدول PlatformDentalToothPlan غير موجود. نفّذ السكربت scripts/sql/platform-dental-tooth-plan.sql في Supabase.",
      },
      { status: 500 },
    );
  }
  return NextResponse.json(
    { error: "حدث خطأ", ...(process.env.NODE_ENV === "development" && { detail: msg }) },
    { status: 500 },
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ patientId: string }> },
) {
  const session = await auth();
  if (!session || !isDoctorOrStaffRole(session.user.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { patientId: patientUserId } = await params;
  const doctorId = getSessionDoctorRecordId(session);
  if (!doctorId) {
    return NextResponse.json({ items: [] });
  }

  const allowed = await doctorHasCareAccessToPlatformPatient(doctorId, patientUserId);
  if (!allowed) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("PlatformDentalToothPlan")
    .select("toothNumber, problemType, note, isDone, price, chargedToBalance")
    .eq("doctorId", doctorId)
    .eq("patientUserId", patientUserId)
    .order("toothNumber", { ascending: true });

  if (error) {
    console.error("PlatformDentalToothPlan GET:", error);
    return mapMissingTable(error);
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ patientId: string }> },
) {
  try {
    const session = await auth();
    if (!session || !isDoctorOrStaffRole(session.user.role)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { patientId: patientUserId } = await params;
    const json = await req.json();
    const { items, chargeToBalance } = bodySchema.parse(json);

    const doctorId = getSessionDoctorRecordId(session);
    if (!doctorId) {
      return NextResponse.json({ error: "الطبيب غير موجود" }, { status: 404 });
    }

    const allowed = await doctorHasCareAccessToPlatformPatient(doctorId, patientUserId);
    if (!allowed) {
      return NextResponse.json(
        {
          error:
            "لا يوجد ربط بعد بينك وبين هذا المريض (موعد، أو معاملة منصة، أو ملف عيادة مربوط بحسابه).",
        },
        { status: 404 },
      );
    }

    const [{ data: oldPlan }, { data: existingTx }] = await Promise.all([
      supabaseAdmin
        .from("PlatformDentalToothPlan")
        .select("toothNumber, price, chargedToBalance")
        .eq("doctorId", doctorId)
        .eq("patientUserId", patientUserId),
      supabaseAdmin
        .from("PlatformPatientTransaction")
        .select("description, amount")
        .eq("doctorId", doctorId)
        .eq("patientId", patientUserId)
        .eq("type", "SERVICE"),
    ]);

    const alreadyChargedDescs = new Set(
      (existingTx ?? []).map(
        (t: { description?: string; amount?: number }) => `${t.description ?? ""}:${t.amount ?? 0}`,
      ),
    );
    const oldCharged = new Map<string, boolean>();
    for (const row of oldPlan ?? []) {
      const key = `${row.toothNumber}:${Number(row.price) || 0}`;
      if ((row as { chargedToBalance?: boolean }).chargedToBalance) {
        oldCharged.set(key, true);
      }
    }

    const { error: delError } = await supabaseAdmin
      .from("PlatformDentalToothPlan")
      .delete()
      .eq("doctorId", doctorId)
      .eq("patientUserId", patientUserId);

    if (delError) {
      console.error("PlatformDentalToothPlan delete:", delError);
      return mapMissingTable(delError);
    }

    if (items.length === 0) {
      return NextResponse.json({ ok: true, items: [], dentalSmsSent: null, dentalSmsNotifyAttempted: false });
    }

    const payload = items.map((item) => {
      const price = item.price ?? 0;
      const key = `${item.toothNumber}:${price}`;
      const alreadyCharged = oldCharged.get(key) ?? false;
      return {
        doctorId,
        patientUserId,
        toothNumber: item.toothNumber,
        problemType: item.problemType,
        note: item.note ?? null,
        isDone: item.isDone ?? false,
        price,
        chargedToBalance: alreadyCharged,
      };
    });

    const { data, error } = await supabaseAdmin
      .from("PlatformDentalToothPlan")
      .insert(payload)
      .select("toothNumber, problemType, note, isDone, price")
      .order("toothNumber", { ascending: true });

    if (error) {
      console.error("PlatformDentalToothPlan insert:", error);
      return mapMissingTable(error);
    }

    let dentalSmsSent: boolean | null = null;
    const newlyChargedLines: { description: string; amount: number }[] = [];

    if (chargeToBalance) {
      const problemLabels: Record<string, string> = {
        FILLING: "حشوة",
        RCT: "عصب",
        CROWN: "تاج",
        IMPLANT: "زرعة",
        EXTRACTION: "خلع",
        ORTHO: "تقويم",
        BLEACHING: "تبييض",
        SCALING: "تنظيف",
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
        const { error: txErr } = await supabaseAdmin.from("PlatformPatientTransaction").insert({
          doctorId,
          patientId: patientUserId,
          type: "SERVICE",
          description: desc,
          amount: negativeAmount,
          notes: "تمت إضافته من مخطط الأسنان (مريض منصة)",
        });
        if (txErr) {
          console.error("PlatformPatientTransaction insert (dental):", txErr);
          continue;
        }
        alreadyChargedDescs.add(chargeKeyNegative);
        newlyChargedLines.push({ description: desc, amount: price });
        await supabaseAdmin
          .from("PlatformDentalToothPlan")
          .update({ chargedToBalance: true })
          .eq("doctorId", doctorId)
          .eq("patientUserId", patientUserId)
          .eq("toothNumber", item.toothNumber);
      }
    }

    if (newlyChargedLines.length > 0) {
      const msg = buildCarePlanNewServicesSmsMessage({
        lines: newlyChargedLines,
        doctorName: session.user.name ?? undefined,
      });
      const { data: userRow } = await supabaseAdmin
        .from("User")
        .select("phone")
        .eq("id", patientUserId)
        .maybeSingle();
      const phone = (userRow as { phone?: string | null } | null)?.phone?.trim();
      if (phone) {
        dentalSmsSent = await sendSms(phone, msg);
      }
    }

    return NextResponse.json({
      ok: true,
      items: data ?? [],
      dentalSmsSent,
      dentalSmsNotifyAttempted: newlyChargedLines.length > 0,
    });
  } catch (err) {
    console.error("PlatformDentalToothPlan POST:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
