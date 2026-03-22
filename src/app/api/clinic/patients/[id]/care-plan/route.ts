import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const putSchema = z.object({
  planType: z.string().min(1),
  data: z.unknown().optional(),
  doctorNotes: z.string().nullable().optional(),
});

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
    const doctor = await prisma.doctor.findUnique({ where: { userId: session.user.id } });
    if (!doctor) return NextResponse.json({ plan: null }, { status: 200 });

    const patient = await prisma.clinicPatient.findFirst({
      where: { id: clinicPatientId, doctorId: doctor.id },
    });
    if (!patient) return NextResponse.json({ error: "المريض غير موجود" }, { status: 404 });

    const plan = await prisma.clinicPatientCarePlan.findUnique({
      where: { clinicPatientId },
    });

    return NextResponse.json({
      plan: plan
        ? {
            id: plan.id,
            planType: plan.planType,
            data: plan.data,
            doctorNotes: plan.doctorNotes,
            updatedAt: plan.updatedAt.toISOString(),
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

    const doctor = await prisma.doctor.findUnique({ where: { userId: session.user.id } });
    if (!doctor) return NextResponse.json({ error: "الطبيب غير موجود" }, { status: 404 });

    const patient = await prisma.clinicPatient.findFirst({
      where: { id: clinicPatientId, doctorId: doctor.id },
    });
    if (!patient) {
      return NextResponse.json({ error: "المريض غير موجود أو غير مصرح" }, { status: 404 });
    }

    const dataJson: Prisma.InputJsonValue =
      body.data !== undefined && body.data !== null
        ? (JSON.parse(JSON.stringify(body.data)) as Prisma.InputJsonValue)
        : {};

    const saved = await prisma.clinicPatientCarePlan.upsert({
      where: { clinicPatientId },
      create: {
        doctorId: doctor.id,
        clinicPatientId,
        planType: body.planType,
        data: dataJson,
        doctorNotes: body.doctorNotes ?? null,
      },
      update: {
        planType: body.planType,
        data: dataJson,
        doctorNotes: body.doctorNotes ?? null,
      },
    });

    return NextResponse.json({
      plan: {
        id: saved.id,
        planType: saved.planType,
        data: saved.data,
        doctorNotes: saved.doctorNotes,
        updatedAt: saved.updatedAt.toISOString(),
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
