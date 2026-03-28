import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
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
import { isDoctorStaffRole } from "@/lib/doctor-team-roles";

const appointmentSchema = z.object({
  doctorId: z.string(),
  patientId: z.string().optional(),
  clinicId: z.string().optional().nullable(),
  timeSlotId: z.string().optional().nullable(),
  appointmentDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  notes: z.string().optional(),
  /**
   * يُقبل 0 (مثلاً طبيب مركز تظهر رسومه لاحقاً من لقطة المركز، أو consultationFee = 0 في القاعدة).
   * سابقاً `positive()` رفضت الرقم 0 فكان الحجز يفشل بصمت بـ «بيانات غير صالحة».
   */
  fee: z.coerce.number().min(0).default(0),
  /** رقم الدور 1..slotCapacity ضمن نفس الفترة */
  slotTurn: z.coerce.number().int().min(1).max(100).optional(),
  /**
   * true فقط عند الحجز من صفحة المركز أو صفحة طبيب داخل المركز.
   * الحجز من صفحة الطبيب العامة لا يُسجّل كحجز مركز ولا يظهر في لوحة المركز.
   */
  viaMedicalCenter: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await req.json();
    const data = appointmentSchema.parse(body);

    const { data: doctorRow } = await supabaseAdmin
      .from("Doctor")
      .select("id, visibleToPatients, medicalCenterId")
      .eq("id", data.doctorId)
      .single();

    const staffBooking = isDoctorStaffRole(session.user.role);
    if (doctorRow?.visibleToPatients === false && session.user.role !== "DOCTOR" && !staffBooking) {
      const bookableViaCenter = Boolean(doctorRow?.medicalCenterId);
      if (!bookableViaCenter) {
        const { data: clinicPatient } = await supabaseAdmin
          .from("ClinicPatient")
          .select("id")
          .eq("doctorId", data.doctorId)
          .eq("userId", session.user.id)
          .maybeSingle();
        if (!clinicPatient) {
          return NextResponse.json({ error: "هذا الطبيب لا يقبل حجوزات من المرضى الجدد" }, { status: 403 });
        }
      }
    }

    const startOfDay = new Date(data.appointmentDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    let resolvedSlotTurn: number | null = null;

    if (data.timeSlotId) {
      const used = await countAppointmentsForSlotOnDay(
        data.doctorId,
        data.appointmentDate,
        data.timeSlotId
      );
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

      if (data.slotTurn !== undefined) {
        if (data.slotTurn > cap) {
          return NextResponse.json(
            { error: `رقم الدور يجب أن يكون بين 1 و ${cap}` },
            { status: 400 }
          );
        }
        if (occupied.has(data.slotTurn)) {
          return NextResponse.json(
            { error: "هذا الدور محجوز بالفعل، اختر دوراً آخر" },
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
    } else {
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
    }

    if (staffBooking) {
      const sid = (session.user as { doctorId?: string | null }).doctorId;
      if (!sid || sid !== data.doctorId) {
        return NextResponse.json({ error: "غير مصرح بحجز لهذا الطبيب" }, { status: 403 });
      }
    }

    let patientId = session.user.id;
    if ((session.user.role === "DOCTOR" || staffBooking) && data.patientId) {
      patientId = data.patientId;
    }

    const fin = await getAppointmentFinanceSnapshot(data.doctorId);
    const isBookedByDoctor = session.user.role === "DOCTOR" || staffBooking;
    const viaCenter = data.viaMedicalCenter === true;
    const isCenterChannelBooking = Boolean(fin.medicalCenterId) && viaCenter;
    const finalFee = isCenterChannelBooking
      ? (fin.consultationFeeSnapshot ?? 0)
      : data.fee;
    const insertRow: Record<string, unknown> = {
      patientId,
      doctorId: data.doctorId,
      clinicId: data.clinicId || null,
      timeSlotId: data.timeSlotId || null,
      appointmentDate: data.appointmentDate,
      startTime: data.startTime,
      endTime: data.endTime,
      notes: data.notes ?? null,
      fee: finalFee,
      // حجز المريض يحتاج موافقة الطبيب أولاً
      status: isBookedByDoctor ? "CONFIRMED" : "DRAFT",
      paymentStatus: "UNPAID",
    };
    if (resolvedSlotTurn !== null) {
      insertRow.slotTurn = resolvedSlotTurn;
    }
    if (isCenterChannelBooking && fin.medicalCenterId) {
      insertRow.medicalCenterId = fin.medicalCenterId;
      insertRow.doctorClinicFeeSnapshot = fin.doctorClinicFeeSnapshot ?? 0;
    }

    const { data: appointment, error: insertErr } = await supabaseAdmin
      .from("Appointment")
      .insert(insertRow)
      .select("id")
      .single();

    if (insertErr || !appointment) {
      console.error("Appointment insert error:", insertErr);
      return NextResponse.json({ error: "فشل إنشاء الموعد" }, { status: 500 });
    }

    await supabaseAdmin.from("Payment").insert({
      appointmentId: appointment.id,
      amount: finalFee,
      status: "UNPAID",
      method: "clinic",
    });

    /* إشعارات للطبيب والمريض */
    const { data: doctorUser } = await supabaseAdmin
      .from("Doctor")
      .select("userId, user:User!Doctor_userId_fkey(name)")
      .eq("id", data.doctorId)
      .single();
    const doctorUserId = doctorUser?.userId;
    const doctorName   = (doctorUser?.user as { name?: string } | null)?.name ?? "الطبيب";
    const patientName  = session.user.name ?? "المريض";
    const formattedDate = formatDateNumeric(data.appointmentDate);

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
      {
        appointmentId: appointment.id,
        message: isBookedByDoctor
          ? "تم تأكيد الموعد بنجاح."
          : "تم إرسال طلب الحجز بنجاح، وبانتظار موافقة الطبيب.",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const first = error.issues[0];
      const hint =
        first?.path.join(".") === "fee" && first?.code === "too_small"
          ? "الرسوم يجب أن تكون رقماً صالحاً (يُقبل 0 عند تعريف الرسوم من المركز)."
          : undefined;
      return NextResponse.json(
        {
          error: "بيانات غير صالحة",
          ...(hint && { hint }),
          ...(process.env.NODE_ENV === "development" && { issues: error.issues }),
        },
        { status: 400 },
      );
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
        doctor:Doctor(user:User!Doctor_userId_fkey(name), specialty:Specialty(nameAr)),
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
    } else if (isDoctorStaffRole(session.user.role)) {
      const did = (session.user as { doctorId?: string | null }).doctorId;
      if (!did) return NextResponse.json({ appointments: [] });
      query = query.eq("doctorId", did);
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
