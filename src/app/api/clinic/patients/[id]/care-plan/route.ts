import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const putSchema = z.object({
  planType: z.string().min(1),
  data: z.unknown().optional(),
  doctorNotes: z.string().nullable().optional(),
});

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
      .select("id")
      .eq("id", clinicPatientId)
      .eq("doctorId", doctor.id)
      .maybeSingle();

    if (!patient) {
      return NextResponse.json({ error: "المريض غير موجود أو غير مصرح" }, { status: 404 });
    }

    const dataJson =
      body.data !== undefined && body.data !== null
        ? (JSON.parse(JSON.stringify(body.data)) as Record<string, unknown>)
        : {};

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
          data: dataJson,
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
          data: dataJson,
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
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    console.error("care-plan PUT:", e);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
