import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { assertMedicalCenterApproved } from "@/lib/medical-center-auth";
import { findOrCreatePatientByPhone } from "@/lib/patient-account";
import { notifyAppointmentBooked } from "@/lib/notifications";
import {
  countAppointmentsForSlotOnDay,
  getAppointmentRowsForSlotOnDay,
  getTimeSlotCapacity,
} from "@/lib/appointment-capacity";
import { buildOccupiedTurnsOrdered, firstFreeSlotTurn } from "@/lib/appointment-slot-turn";
import { getAppointmentFinanceSnapshot } from "@/lib/medical-center-finance";
import { formatDateNumeric } from "@/lib/utils";
import { z } from "zod";

const walkInSchema = z.object({
  patientName: z.string().min(2),
  patientPhone: z.string().min(9),
  doctorId: z.string(),
  appointmentDate: z.string(),
  timeSlotId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  fee: z.number().positive(),
  notes: z.string().optional(),
  slotTurn: z.number().int().min(1).max(100).optional(),
});

/** حجوزات أطباء المركز */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const gate = await assertMedicalCenterApproved(session.user.id);
    if (!gate.ok) return gate.response;
    const centerId = gate.centerId;

    const { data: doctors } = await supabaseAdmin
      .from("Doctor")
      .select("id")
      .eq("medicalCenterId", centerId);

    const ids = (doctors ?? []).map((d) => d.id);
    if (!ids.length) {
      return NextResponse.json({ appointments: [] });
    }

    const { data, error } = await supabaseAdmin
      .from("Appointment")
      .select(`
        id,
        appointmentDate,
        startTime,
        endTime,
        status,
        paymentStatus,
        fee,
        doctorClinicFeeSnapshot,
        medicalCenterId,
        notes,
        patient:User(name, phone, email),
        doctor:Doctor(id, user:User(name), specialty:Specialty(nameAr))
      `)
      .in("doctorId", ids)
      .order("appointmentDate", { ascending: false })
      .limit(300);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "تعذر التحميل" }, { status: 500 });
    }

    return NextResponse.json({ appointments: data ?? [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

/** حجز سريع من المركز الطبي (مريض بالاسم والهاتف) */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const gate = await assertMedicalCenterApproved(session.user.id);
    if (!gate.ok) return gate.response;
    const centerId = gate.centerId;

    const body = await req.json();
    const data = walkInSchema.parse(body);

    const { data: doctorRow, error: docErr } = await supabaseAdmin
      .from("Doctor")
      .select("id")
      .eq("id", data.doctorId)
      .eq("medicalCenterId", centerId)
      .maybeSingle();

    if (docErr || !doctorRow) {
      return NextResponse.json({ error: "الطبيب غير مرتبط بمركزك" }, { status: 404 });
    }

    const { data: slot, error: slotErr } = await supabaseAdmin
      .from("TimeSlot")
      .select("id, doctorId, startTime, endTime, isActive, clinicId, slotCapacity")
      .eq("id", data.timeSlotId)
      .eq("doctorId", data.doctorId)
      .maybeSingle();

    if (slotErr || !slot || slot.isActive === false) {
      return NextResponse.json({ error: "الدور غير صالح" }, { status: 400 });
    }

    if (slot.startTime !== data.startTime || slot.endTime !== data.endTime) {
      return NextResponse.json({ error: "أوقات الدور لا تتطابق" }, { status: 400 });
    }

    const used = await countAppointmentsForSlotOnDay(data.doctorId, data.appointmentDate, data.timeSlotId);
    const cap = await getTimeSlotCapacity(data.timeSlotId);
    if (used >= cap) {
      return NextResponse.json(
        { error: "هذا الموعد محجوز بالفعل، يرجى اختيار وقت آخر" },
        { status: 409 }
      );
    }

    const rows = await getAppointmentRowsForSlotOnDay(
      data.doctorId,
      data.appointmentDate,
      data.timeSlotId
    );
    const occupied = buildOccupiedTurnsOrdered(rows, cap);
    let resolvedSlotTurn: number;
    if (data.slotTurn !== undefined) {
      if (data.slotTurn > cap) {
        return NextResponse.json(
          { error: `رقم الدور يجب أن يكون بين 1 و ${cap}` },
          { status: 400 }
        );
      }
      if (occupied.has(data.slotTurn)) {
        return NextResponse.json(
          { error: "هذا الدور محجوز بالفعل" },
          { status: 409 }
        );
      }
      resolvedSlotTurn = data.slotTurn;
    } else {
      const free = firstFreeSlotTurn(occupied, cap);
      if (free === null) {
        return NextResponse.json(
          { error: "لا توجد أدوار متاحة لهذه الفترة" },
          { status: 409 }
        );
      }
      resolvedSlotTurn = free;
    }

    const patientResult = await findOrCreatePatientByPhone(data.patientName, data.patientPhone);
    if ("error" in patientResult) {
      return NextResponse.json({ error: patientResult.error }, { status: 400 });
    }
    const patientId = patientResult.id;

    const clinicId = (slot as { clinicId?: string | null }).clinicId ?? null;

    const { data: appointment, error: insertErr } = await supabaseAdmin
      .from("Appointment")
      .insert({
        patientId,
        doctorId: data.doctorId,
        clinicId,
        timeSlotId: data.timeSlotId,
        appointmentDate: data.appointmentDate,
        startTime: data.startTime,
        endTime: data.endTime,
        notes: data.notes ?? null,
        fee: data.fee,
        status: "CONFIRMED",
        paymentStatus: "UNPAID",
        slotTurn: resolvedSlotTurn,
      })
      .select("id")
      .single();

    if (insertErr || !appointment) {
      console.error(insertErr);
      return NextResponse.json({ error: "فشل إنشاء الموعد" }, { status: 500 });
    }

    await supabaseAdmin.from("Payment").insert({
      appointmentId: appointment.id,
      amount: data.fee,
      status: "UNPAID",
      method: "clinic",
    });

    const { data: doctorUser } = await supabaseAdmin
      .from("Doctor")
      .select("userId, user:User(name)")
      .eq("id", data.doctorId)
      .single();
    const doctorUserId = doctorUser?.userId;
    const doctorName =
      (doctorUser?.user as { name?: string } | null)?.name ?? "الطبيب";
    const formattedDate = formatDateNumeric(data.appointmentDate);

    if (doctorUserId) {
      await notifyAppointmentBooked({
        doctorUserId,
        patientUserId: patientId,
        patientName: data.patientName,
        doctorName,
        date: formattedDate,
        appointmentId: appointment.id,
      });
    }

    return NextResponse.json(
      { appointmentId: appointment.id, message: "تم تسجيل الحجز" },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة", details: e.issues }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
