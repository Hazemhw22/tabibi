import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { id } = await params;

    const { data: appointment, error: fetchErr } = await supabaseAdmin
      .from("Appointment")
      .select(`
        *,
        patient:User(name, email, phone),
        doctor:Doctor(user:User(name), specialty:Specialty(nameAr)),
        clinic:Clinic(*),
        payment:Payment(*)
      `)
      .eq("id", id)
      .single();

    if (fetchErr || !appointment) {
      return NextResponse.json({ error: "الموعد غير موجود" }, { status: 404 });
    }

    const apt = appointment as { patientId: string; doctorId: string };
    if (apt.patientId !== session.user.id && session.user.role !== "PLATFORM_ADMIN") {
      const { data: doctor } = await supabaseAdmin
        .from("Doctor")
        .select("id")
        .eq("userId", session.user.id)
        .single();
      if (!doctor || apt.doctorId !== doctor.id) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
      }
    }

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error("Get appointment error:", error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || typeof status !== "string") {
      return NextResponse.json({ error: "الحالة مطلوبة" }, { status: 400 });
    }

    const statusUpper = status.toUpperCase();

    const { data: appointment, error: findErr } = await supabaseAdmin
      .from("Appointment")
      .select("id, patientId, doctorId")
      .eq("id", id)
      .single();

    if (findErr || !appointment) {
      return NextResponse.json({ error: "الموعد غير موجود" }, { status: 404 });
    }

    if (session.user.role === "DOCTOR") {
      const { data: doctor } = await supabaseAdmin
        .from("Doctor")
        .select("id")
        .eq("userId", session.user.id)
        .single();
      if (!doctor || appointment.doctorId !== doctor.id) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
      }
      if (!["COMPLETED", "NO_SHOW"].includes(statusUpper)) {
        return NextResponse.json({ error: "حالة غير مسموحة" }, { status: 400 });
      }
    } else if (session.user.role === "PATIENT") {
      if (appointment.patientId !== session.user.id) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
      }
      if (statusUpper !== "CANCELLED") {
        return NextResponse.json({ error: "المرضى يمكنهم فقط الإلغاء" }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const updatePayload: { status: string; updatedAt: string; paymentStatus?: string } = {
      status: statusUpper,
      updatedAt: new Date().toISOString(),
    };
    if (statusUpper === "COMPLETED") {
      updatePayload.paymentStatus = "PAID";
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("Appointment")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      console.error("Update appointment error:", updateErr);
      return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
    }

    if (statusUpper === "COMPLETED") {
      await supabaseAdmin
        .from("Payment")
        .update({ status: "PAID", updatedAt: new Date().toISOString() })
        .eq("appointmentId", id);
    }

    return NextResponse.json({ appointment: updated });
  } catch (error) {
    console.error("Update appointment error:", error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
