import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1),
  date: z.string(),
  time: z.string(),
  duration: z.number().int().positive().default(30),
  notes: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DOCTOR")
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    const { id } = await params;
    const { data: doctor } = await supabaseAdmin
      .from("Doctor")
      .select("id")
      .eq("userId", session.user.id)
      .single();
    if (!doctor) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

    const { data: patient } = await supabaseAdmin
      .from("ClinicPatient")
      .select("id, doctorId, userId, name")
      .eq("id", id)
      .single();
    if (!patient || patient.doctorId !== doctor.id)
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    const body = await req.json();
    const data = schema.parse(body);

    const { data: appointment, error } = await supabaseAdmin
      .from("ClinicAppointment")
      .insert({
        doctorId: doctor.id,
        clinicPatientId: id,
        title: data.title,
        date: new Date(data.date).toISOString(),
        time: data.time,
        duration: data.duration ?? 30,
        notes: data.notes ?? null,
        status: "SCHEDULED",
      })
      .select("id, title, date, time, status")
      .single();

    if (error) {
      console.error("ClinicAppointment insert error:", error);
      return NextResponse.json({ error: "فشل إضافة الموعد" }, { status: 500 });
    }

    const formattedDate = new Date(data.date).toLocaleDateString("ar-SA");

    /* إشعار للطبيب دائماً */
    await createNotification({
      userId: session.user.id,
      title: "موعد مُضاف",
      message: `تم تسجيل موعد "${data.title}" للمريض ${patient.name ?? ""} بتاريخ ${formattedDate} الساعة ${data.time}`,
      type: "appointment",
      link: `/dashboard/doctor/patients?id=${id}&source=clinic`,
    });

    /* إشعار للمريض إن كان مرتبطاً بحساب */
    if (patient?.userId) {
      await createNotification({
        userId: patient.userId,
        title: "موعد جديد في العيادة",
        message: `تم إضافة موعد "${data.title}" بتاريخ ${formattedDate} الساعة ${data.time}`,
        type: "appointment",
        link: "/dashboard/patient/appointments",
      });
    }

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
