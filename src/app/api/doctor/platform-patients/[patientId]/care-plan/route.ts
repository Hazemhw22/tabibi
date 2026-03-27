import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  CARE_PLAN_LABELS,
  type CarePlanType,
  isStructuredIntlCarePlan,
} from "@/lib/specialty-plan-registry";
import type { CarePlanServiceLine } from "@/lib/care-plan-billing";
import { extractCarePlanServiceLines, normalizeCarePlanCosts } from "@/lib/care-plan-billing";
import { syncCarePlanFollowUpsToAppointments } from "@/lib/care-plan-appointment-sync";
import { buildCarePlanNewServicesSmsMessage, buildCarePlanSavedInfoSmsMessage, sendSms } from "@/lib/sms";

const putSchema = z.object({
  planType: z.string().min(1),
  data: z.unknown().optional(),
  doctorNotes: z.string().nullable().optional(),
});

function shouldSendCarePlanInfoOnlySms(planType: string): boolean {
  return (
    planType === "FETAL_IMAGING" ||
    planType === "OB_GYN" ||
    isStructuredIntlCarePlan(planType as CarePlanType)
  );
}

function mapSupabaseError(err: { message?: string; code?: string } | null) {
  const msg = err?.message ?? "";
  if (/does not exist|relation|42P01|schema cache/i.test(msg)) {
    return NextResponse.json(
      {
        error:
          "جدول PlatformPatientCarePlan غير موجود في قاعدة البيانات. نفّذ: npx prisma db push ثم أعد تشغيل السيرفر.",
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
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { patientId: patientUserId } = await params;

    const { data: doctor, error: docErr } = await supabaseAdmin
      .from("Doctor")
      .select("id")
      .eq("userId", session.user.id)
      .single();

    if (docErr || !doctor) {
      return NextResponse.json({ plan: null }, { status: 200 });
    }

    const { data: apts } = await supabaseAdmin
      .from("Appointment")
      .select("id")
      .eq("doctorId", doctor.id)
      .eq("patientId", patientUserId)
      .limit(1);

    if (!apts?.length) {
      return NextResponse.json({ error: "المريض غير مرتبط بحجوزاتك" }, { status: 404 });
    }

    const { data: plan, error: planErr } = await supabaseAdmin
      .from("PlatformPatientCarePlan")
      .select("id, planType, data, doctorNotes, updatedAt")
      .eq("doctorId", doctor.id)
      .eq("patientUserId", patientUserId)
      .maybeSingle();

    if (planErr) {
      console.error("PlatformPatientCarePlan GET:", planErr);
      return mapSupabaseError(planErr);
    }

    return NextResponse.json({
      plan: plan
        ? {
            id: plan.id,
            planType: plan.planType,
            data: plan.data,
            doctorNotes: plan.doctorNotes,
            updatedAt:
              typeof plan.updatedAt === "string"
                ? plan.updatedAt
                : new Date(plan.updatedAt as string).toISOString(),
          }
        : null,
    });
  } catch (e) {
    console.error("platform care-plan GET:", e);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { patientId: patientUserId } = await params;
    const body = putSchema.parse(await req.json());

    const { data: doctor, error: docErr } = await supabaseAdmin
      .from("Doctor")
      .select("id")
      .eq("userId", session.user.id)
      .single();

    if (docErr || !doctor) {
      return NextResponse.json({ error: "الطبيب غير موجود" }, { status: 404 });
    }

    const { data: aptsPut } = await supabaseAdmin
      .from("Appointment")
      .select("id")
      .eq("doctorId", doctor.id)
      .eq("patientId", patientUserId)
      .limit(1);

    if (!aptsPut?.length) {
      return NextResponse.json({ error: "المريض غير مرتبط بحجوزاتك" }, { status: 404 });
    }

    const rawDataJson =
      body.data !== undefined && body.data !== null
        ? (JSON.parse(JSON.stringify(body.data)) as Record<string, unknown>)
        : {};
    const normalizedData = normalizeCarePlanCosts(body.planType as CarePlanType, rawDataJson);

    const now = new Date().toISOString();

    const { data: existing } = await supabaseAdmin
      .from("PlatformPatientCarePlan")
      .select("id")
      .eq("doctorId", doctor.id)
      .eq("patientUserId", patientUserId)
      .maybeSingle();

    let saved: {
      id: string;
      planType: string;
      data: unknown;
      doctorNotes: string | null;
      updatedAt: string;
    } | null = null;

    if (existing?.id) {
      const { data: row, error: upErr } = await supabaseAdmin
        .from("PlatformPatientCarePlan")
        .update({
          planType: body.planType,
          data: normalizedData,
          doctorNotes: body.doctorNotes ?? null,
          updatedAt: now,
        })
        .eq("id", existing.id)
        .select("id, planType, data, doctorNotes, updatedAt")
        .single();

      if (upErr) {
        console.error("PlatformPatientCarePlan UPDATE:", upErr);
        return mapSupabaseError(upErr);
      }
      saved = row;
    } else {
      const { data: row, error: insErr } = await supabaseAdmin
        .from("PlatformPatientCarePlan")
        .insert({
          id: randomUUID(),
          doctorId: doctor.id,
          patientUserId,
          planType: body.planType,
          data: normalizedData,
          doctorNotes: body.doctorNotes ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .select("id, planType, data, doctorNotes, updatedAt")
        .single();

      if (insErr) {
        console.error("PlatformPatientCarePlan INSERT:", insErr);
        return mapSupabaseError(insErr);
      }
      saved = row;
    }

    if (!saved) {
      return NextResponse.json({ error: "فشل الحفظ" }, { status: 500 });
    }

    let carePlanSmsSent: boolean | null = null;

    // تسجيل تكاليف الخطة كخدمة (بالسالب) في معاملات مرضى المنصة بدون تكرار.
    const serviceLines = extractCarePlanServiceLines(
      body.planType as CarePlanType,
      normalizedData,
    );
    if (serviceLines.length > 0) {
      const { data: existingTx } = await supabaseAdmin
        .from("PlatformPatientTransaction")
        .select("description, amount")
        .eq("doctorId", doctor.id)
        .eq("patientId", patientUserId)
        .eq("type", "SERVICE");

      const existing = new Set(
        (existingTx ?? []).map(
          (t: { description?: string | null; amount?: number | null }) =>
            `${t.description ?? ""}:${Number(t.amount ?? 0)}`,
        ),
      );

      const newlyInserted: CarePlanServiceLine[] = [];
      for (const line of serviceLines) {
        const amount = -Math.abs(Number(line.amount || 0));
        const key = `${line.description}:${amount}`;
        if (existing.has(key)) continue;
        const { error: txInsErr } = await supabaseAdmin.from("PlatformPatientTransaction").insert({
          doctorId: doctor.id,
          patientId: patientUserId,
          type: "SERVICE",
          description: line.description,
          amount,
          notes: "تمت إضافته تلقائياً من خطة العلاج",
        });
        if (txInsErr) {
          console.error("platform care-plan PlatformPatientTransaction insert:", txInsErr);
          continue;
        }
        existing.add(key);
        newlyInserted.push({ description: line.description, amount: Math.abs(Number(line.amount || 0)) });
      }

      if (newlyInserted.length > 0) {
        const { data: userRow } = await supabaseAdmin
          .from("User")
          .select("phone")
          .eq("id", patientUserId)
          .maybeSingle();
        const phone = (userRow as { phone?: string | null } | null)?.phone?.trim();
        if (phone) {
          const msg = buildCarePlanNewServicesSmsMessage({
            lines: newlyInserted,
            doctorName: session.user.name ?? undefined,
          });
          carePlanSmsSent = await sendSms(phone, msg);
        }
      }
    }

    if (carePlanSmsSent === null && shouldSendCarePlanInfoOnlySms(body.planType)) {
      const planLabel =
        CARE_PLAN_LABELS[body.planType as CarePlanType] ?? "خطة العلاج";
      const msg = buildCarePlanSavedInfoSmsMessage({
        planLabel,
        doctorName: session.user.name ?? undefined,
      });
      const { data: userRow } = await supabaseAdmin
        .from("User")
        .select("phone")
        .eq("id", patientUserId)
        .maybeSingle();
      const phone = (userRow as { phone?: string | null } | null)?.phone?.trim();
      if (phone) {
        carePlanSmsSent = await sendSms(phone, msg);
      }
    }

    const dataObj =
      saved.data && typeof saved.data === "object" && saved.data !== null
        ? (saved.data as Record<string, unknown>)
        : {};
    await syncCarePlanFollowUpsToAppointments({
      patientUserId,
      doctorId: doctor.id,
      planData: dataObj,
      planType: saved.planType,
    });

    return NextResponse.json({
      plan: {
        id: saved.id,
        planType: saved.planType,
        data: saved.data,
        doctorNotes: saved.doctorNotes,
        updatedAt:
          typeof saved.updatedAt === "string"
            ? saved.updatedAt
            : new Date(saved.updatedAt).toISOString(),
      },
      carePlanSmsSent,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    console.error("platform care-plan PUT:", e);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
