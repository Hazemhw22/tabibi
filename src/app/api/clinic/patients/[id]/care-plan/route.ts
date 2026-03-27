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
import { buildCarePlanNewServicesSmsMessage, buildCarePlanSavedInfoSmsMessage } from "@/lib/sms";
import { sendToClinicPatientPhoneOrWhatsapp } from "@/lib/patient-contact-notify";

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
          "جدول ClinicPatientCarePlan غير موجود في قاعدة البيانات. نفّذ: npx prisma db push ثم أعد تشغيل السيرفر.",
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { id: clinicPatientId } = await params;

    const { data: doctor, error: docErr } = await supabaseAdmin
      .from("Doctor")
      .select("id")
      .eq("userId", session.user.id)
      .single();

    if (docErr || !doctor) {
      return NextResponse.json({ plan: null }, { status: 200 });
    }

    const { data: patient } = await supabaseAdmin
      .from("ClinicPatient")
      .select("id")
      .eq("id", clinicPatientId)
      .eq("doctorId", doctor.id)
      .maybeSingle();

    if (!patient) {
      return NextResponse.json({ error: "المريض غير موجود" }, { status: 404 });
    }

    const { data: plan, error: planErr } = await supabaseAdmin
      .from("ClinicPatientCarePlan")
      .select("id, planType, data, doctorNotes, updatedAt")
      .eq("clinicPatientId", clinicPatientId)
      .eq("doctorId", doctor.id)
      .maybeSingle();

    if (planErr) {
      console.error("ClinicPatientCarePlan GET:", planErr);
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
    console.error("care-plan GET:", e);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { id: clinicPatientId } = await params;
    const body = putSchema.parse(await req.json());

    const { data: doctor, error: docErr } = await supabaseAdmin
      .from("Doctor")
      .select("id")
      .eq("userId", session.user.id)
      .single();

    if (docErr || !doctor) {
      return NextResponse.json({ error: "الطبيب غير موجود" }, { status: 404 });
    }

    const { data: patient } = await supabaseAdmin
      .from("ClinicPatient")
      .select("id, userId, phone, whatsapp")
      .eq("id", clinicPatientId)
      .eq("doctorId", doctor.id)
      .maybeSingle();

    if (!patient) {
      return NextResponse.json({ error: "المريض غير موجود أو غير مصرح" }, { status: 404 });
    }

    const rawDataJson =
      body.data !== undefined && body.data !== null
        ? (JSON.parse(JSON.stringify(body.data)) as Record<string, unknown>)
        : {};
    const normalizedData = normalizeCarePlanCosts(body.planType as CarePlanType, rawDataJson);

    const now = new Date().toISOString();

    const { data: planForThisDoctor } = await supabaseAdmin
      .from("ClinicPatientCarePlan")
      .select("id")
      .eq("clinicPatientId", clinicPatientId)
      .eq("doctorId", doctor.id)
      .maybeSingle();

    let existingId: string | null = planForThisDoctor?.id ?? null;

    if (!existingId) {
      const { data: planAny } = await supabaseAdmin
        .from("ClinicPatientCarePlan")
        .select("id, doctorId")
        .eq("clinicPatientId", clinicPatientId)
        .maybeSingle();
      if (planAny?.id && planAny.doctorId !== doctor.id) {
        return NextResponse.json(
          {
            error:
              "خطة العلاج على هذا الملف مسجّلة لطبيب آخر. مواعيد المتابعة والملاحظات العامة وبيانات النموذج مرتبطة بالطبيب الذي أنشأها ولا تظهر لغيره.",
          },
          { status: 403 },
        );
      }
    }

    let saved: {
      id: string;
      planType: string;
      data: unknown;
      doctorNotes: string | null;
      updatedAt: string;
    } | null = null;

    if (existingId) {
      const { data: row, error: upErr } = await supabaseAdmin
        .from("ClinicPatientCarePlan")
        .update({
          planType: body.planType,
          data: normalizedData,
          doctorNotes: body.doctorNotes ?? null,
          updatedAt: now,
        })
        .eq("id", existingId)
        .eq("doctorId", doctor.id)
        .select("id, planType, data, doctorNotes, updatedAt")
        .single();

      if (upErr) {
        console.error("ClinicPatientCarePlan UPDATE:", upErr);
        return mapSupabaseError(upErr);
      }
      saved = row;
    } else {
      const { data: row, error: insErr } = await supabaseAdmin
        .from("ClinicPatientCarePlan")
        .insert({
          id: randomUUID(),
          doctorId: doctor.id,
          clinicPatientId,
          planType: body.planType,
          data: normalizedData,
          doctorNotes: body.doctorNotes ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .select("id, planType, data, doctorNotes, updatedAt")
        .single();

      if (insErr) {
        console.error("ClinicPatientCarePlan INSERT:", insErr);
        return mapSupabaseError(insErr);
      }
      saved = row;
    }

    if (!saved) {
      return NextResponse.json({ error: "فشل الحفظ" }, { status: 500 });
    }

    let carePlanSmsSent: boolean | null = null;

    // تسجيل تكاليف الخطة كخدمات (بالسالب) مع منع التكرار.
    const serviceLines = extractCarePlanServiceLines(
      body.planType as CarePlanType,
      normalizedData,
    );
    if (serviceLines.length > 0) {
      const { data: existingTx } = await supabaseAdmin
        .from("ClinicTransaction")
        .select("description, amount")
        .eq("clinicPatientId", clinicPatientId)
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
        const { error: txInsErr } = await supabaseAdmin.from("ClinicTransaction").insert({
          clinicPatientId,
          type: "SERVICE",
          description: line.description,
          amount,
          createdBy: session.user.id,
        });
        if (txInsErr) {
          console.error("care-plan ClinicTransaction insert:", txInsErr);
          continue;
        }
        existing.add(key);
        newlyInserted.push({ description: line.description, amount: Math.abs(Number(line.amount || 0)) });
      }

      if (newlyInserted.length > 0) {
        const msg = buildCarePlanNewServicesSmsMessage({
          lines: newlyInserted,
          doctorName: session.user.name ?? undefined,
        });
        let fallbackUserPhone: string | null = null;
        const clinicPhone = String(patient.phone ?? "").trim();
        if (!clinicPhone && patient.userId) {
          const { data: linkedUser } = await supabaseAdmin
            .from("User")
            .select("phone")
            .eq("id", patient.userId)
            .maybeSingle();
          fallbackUserPhone = (linkedUser as { phone?: string | null } | null)?.phone?.trim() ?? null;
        }
        carePlanSmsSent = await sendToClinicPatientPhoneOrWhatsapp({
          clinicPhone: patient.phone,
          whatsapp: (patient as { whatsapp?: string | null }).whatsapp,
          fallbackUserPhone,
          message: msg,
        });
      }
    }

    // خطط تصوير جنين / نساء / نماذج دولية: لا تُستخرج منها بنود تكاليف تلقائياً — نرسل على الأقل إشعار تحديث الخطة.
    if (carePlanSmsSent === null && shouldSendCarePlanInfoOnlySms(body.planType)) {
      const planLabel =
        CARE_PLAN_LABELS[body.planType as CarePlanType] ?? "خطة العلاج";
      const msg = buildCarePlanSavedInfoSmsMessage({
        planLabel,
        doctorName: session.user.name ?? undefined,
      });
      let fallbackUserPhone: string | null = null;
      const clinicPhone = String(patient.phone ?? "").trim();
      if (!clinicPhone && patient.userId) {
        const { data: linkedUser } = await supabaseAdmin
          .from("User")
          .select("phone")
          .eq("id", patient.userId)
          .maybeSingle();
        fallbackUserPhone = (linkedUser as { phone?: string | null } | null)?.phone?.trim() ?? null;
      }
      carePlanSmsSent = await sendToClinicPatientPhoneOrWhatsapp({
        clinicPhone: patient.phone,
        whatsapp: (patient as { whatsapp?: string | null }).whatsapp,
        fallbackUserPhone,
        message: msg,
      });
    }

    const dataObj =
      saved.data && typeof saved.data === "object" && saved.data !== null
        ? (saved.data as Record<string, unknown>)
        : {};
    if (patient.userId) {
      await syncCarePlanFollowUpsToAppointments({
        patientUserId: patient.userId as string,
        doctorId: doctor.id,
        planData: dataObj,
        planType: saved.planType,
      });
    }

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
    console.error("care-plan PUT:", e);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
