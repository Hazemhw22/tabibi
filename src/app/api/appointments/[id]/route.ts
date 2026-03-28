import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatDateNumeric } from "@/lib/utils";
import { buildAppointmentConfirmedSmsMessage, sendSms } from "@/lib/sms";
import { notifyAppointmentConfirmedByDoctor } from "@/lib/notifications";

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
        doctor:Doctor(user:User!Doctor_userId_fkey(name), specialty:Specialty(nameAr)),
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
      .select("id, patientId, doctorId, appointmentDate, startTime, status")
      .eq("id", id)
      .single();

    if (findErr || !appointment) {
      return NextResponse.json({ error: "الموعد غير موجود" }, { status: 404 });
    }

    const prevStatus = String((appointment as { status?: string }).status ?? "").toUpperCase();

    if (session.user.role === "PATIENT") {
      if (appointment.patientId !== session.user.id) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
      }
      if (statusUpper !== "CANCELLED") {
        return NextResponse.json({ error: "المرضى يمكنهم فقط الإلغاء" }, { status: 400 });
      }
      /* المريض يمكنه الإلغاء فقط قبل 24 ساعة من الموعد */
      const aptDateTime = new Date(`${(appointment as { appointmentDate: string }).appointmentDate}T${(appointment as { startTime: string }).startTime || "00:00"}`);
      const minCancelTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      if (aptDateTime < minCancelTime) {
        return NextResponse.json({ error: "لا يمكن الإلغاء قبل أقل من 24 ساعة من الموعد" }, { status: 400 });
      }
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
      if (!["CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"].includes(statusUpper)) {
        return NextResponse.json({ error: "حالة غير مسموحة" }, { status: 400 });
      }
    } else if (session.user.role !== "PATIENT") {
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

    /* تأكيد الطبيب للحجز: إشعار + SMS للمريض */
    if (
      session.user.role === "DOCTOR" &&
      prevStatus === "DRAFT" &&
      statusUpper === "CONFIRMED"
    ) {
      const { data: aptFull } = await supabaseAdmin
        .from("Appointment")
        .select(
          `
          patientId,
          appointmentDate,
          startTime,
          patient:User(phone, name),
          doctor:Doctor(user:User!Doctor_userId_fkey(name)),
          clinic:Clinic(name)
        `,
        )
        .eq("id", id)
        .single();

      if (aptFull) {
        type Pt = { phone?: string | null; name?: string | null };
        type DocRel = { user?: { name?: string | null } };
        type Clin = { name?: string | null };
        const patient = aptFull.patient as Pt | Pt[] | null;
        const p = Array.isArray(patient) ? patient[0] : patient;
        const doctorRel = aptFull.doctor as DocRel | DocRel[] | null;
        const d = Array.isArray(doctorRel) ? doctorRel[0] : doctorRel;
        const clinicRel = aptFull.clinic as Clin | Clin[] | null;
        const c = Array.isArray(clinicRel) ? clinicRel[0] : clinicRel;
        const doctorName = d?.user?.name ?? "الطبيب";
        const rawDate = (aptFull as { appointmentDate: string }).appointmentDate;
        const dateStr = formatDateNumeric(typeof rawDate === "string" ? rawDate : new Date(rawDate).toISOString());
        const timeStr = String((aptFull as { startTime: string }).startTime ?? "").slice(0, 5);
        const msg = buildAppointmentConfirmedSmsMessage({
          doctorName,
          dateStr,
          timeStr,
          clinicName: c?.name ?? null,
        });
        const phone = p?.phone?.trim();
        if (phone) {
          await sendSms(phone, msg);
        }
        await notifyAppointmentConfirmedByDoctor({
          patientUserId: (aptFull as { patientId: string }).patientId,
          doctorName,
          date: dateStr,
          time: timeStr,
        });
      }
    }

    return NextResponse.json({ appointment: updated });
  } catch (error) {
    console.error("Update appointment error:", error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
