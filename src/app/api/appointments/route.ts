import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notifyAppointmentBooked } from "@/lib/notifications";
import { z } from "zod";

const appointmentSchema = z.object({
  doctorId: z.string(),
  patientId: z.string().optional(),
  clinicId: z.string().optional().nullable(),
  timeSlotId: z.string().optional().nullable(),
  appointmentDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  notes: z.string().optional(),
  fee: z.number().positive(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await req.json();
    const data = appointmentSchema.parse(body);

    const startOfDay = new Date(data.appointmentDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    const { data: existing } = await supabaseAdmin
      .from("Appointment")
      .select("id")
      .eq("doctorId", data.doctorId)
      .gte("appointmentDate", startOfDay.toISOString())
      .lt("appointmentDate", endOfDay.toISOString())
      .eq("startTime", data.startTime)
      .in("status", ["DRAFT", "CONFIRMED"])
      .limit(1);

    if (existing?.length) {
      return NextResponse.json(
        { error: "هذا الموعد محجوز بالفعل، يرجى اختيار وقت آخر" },
        { status: 409 }
      );
    }

    let patientId = session.user.id;
    if (session.user.role === "DOCTOR" && data.patientId) {
      patientId = data.patientId;
    }

    const { data: appointment, error: insertErr } = await supabaseAdmin
      .from("Appointment")
      .insert({
        patientId,
        doctorId: data.doctorId,
        clinicId: data.clinicId || null,
        timeSlotId: data.timeSlotId || null,
        appointmentDate: data.appointmentDate,
        startTime: data.startTime,
        endTime: data.endTime,
        notes: data.notes ?? null,
        fee: data.fee,
        status: "CONFIRMED",
        paymentStatus: "UNPAID",
      })
      .select("id")
      .single();

    if (insertErr || !appointment) {
      console.error("Appointment insert error:", insertErr);
      return NextResponse.json({ error: "فشل إنشاء الموعد" }, { status: 500 });
    }

    await supabaseAdmin.from("Payment").insert({
      appointmentId: appointment.id,
      amount: data.fee,
      status: "UNPAID",
      method: "clinic",
    });

    /* إشعارات للطبيب والمريض */
    const { data: doctorUser } = await supabaseAdmin
      .from("Doctor")
      .select("userId, user:User(name)")
      .eq("id", data.doctorId)
      .single();
    const doctorUserId = doctorUser?.userId;
    const doctorName   = (doctorUser?.user as { name?: string } | null)?.name ?? "الطبيب";
    const patientName  = session.user.name ?? "المريض";
    const formattedDate = new Date(data.appointmentDate).toLocaleDateString("ar-SA");

    if (doctorUserId) {
      await notifyAppointmentBooked({
        doctorUserId,
        patientUserId: patientId,
        patientName,
        doctorName,
        date: formattedDate,
        appointmentId: appointment.id,
      });
    }

    return NextResponse.json(
      { appointmentId: appointment.id, message: "تم تأكيد الموعد. الدفع عند الوصول للعيادة." },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    console.error("Appointment error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let query = supabaseAdmin
      .from("Appointment")
      .select(`
        *,
        patient:User(name, email, phone),
        doctor:Doctor(user:User(name), specialty:Specialty(nameAr)),
        clinic:Clinic(*),
        payment:Payment(*)
      `)
      .order("appointmentDate", { ascending: false });

    if (session.user.role === "PATIENT") {
      query = query.eq("patientId", session.user.id);
    } else if (session.user.role === "DOCTOR") {
      const { data: doc } = await supabaseAdmin
        .from("Doctor")
        .select("id")
        .eq("userId", session.user.id)
        .single();
      if (!doc) return NextResponse.json({ appointments: [] });
      query = query.eq("doctorId", doc.id);
    } else {
      return NextResponse.json({ appointments: [] });
    }

    if (status) query = query.eq("status", status.toUpperCase());

    const { data: appointments, error } = await query;

    if (error) {
      console.error("Get appointments error:", error);
      return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
    }

    return NextResponse.json({ appointments: appointments ?? [] });
  } catch (error) {
    console.error("Get appointments error:", error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
