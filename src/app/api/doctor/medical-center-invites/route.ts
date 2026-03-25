import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getOrCreateMainClinicForCenterDoctor } from "@/lib/medical-center-clinic";
import { z } from "zod";

type ProposedSlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotCapacity?: number;
};

/** طلبات انضمام مراكز طبية — للطبيب */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { data: doctor, error: dErr } = await supabaseAdmin
      .from("Doctor")
      .select("id")
      .eq("userId", session.user.id)
      .single();

    if (dErr || !doctor) {
      return NextResponse.json({ error: "ملف الطبيب غير موجود" }, { status: 404 });
    }

    const doctorId = (doctor as { id: string }).id;

    const { data: rows, error } = await supabaseAdmin
      .from("MedicalCenterDoctorInvite")
      .select(
        "id, status, consultationFee, doctorClinicFee, patientFeeServiceType, proposedTimeSlotsJson, createdAt, medicalCenterId"
      )
      .eq("doctorId", doctorId)
      .eq("status", "PENDING")
      .order("createdAt", { ascending: false });

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "تعذر التحميل" }, { status: 500 });
    }

    const centerIds = [...new Set((rows ?? []).map((r: { medicalCenterId: string }) => r.medicalCenterId))];
    let centerMap = new Map<string, { nameAr?: string; name?: string; city?: string }>();
    if (centerIds.length > 0) {
      const { data: centers } = await supabaseAdmin
        .from("MedicalCenter")
        .select("id, name, nameAr, city")
        .in("id", centerIds);
      for (const c of centers ?? []) {
        const row = c as { id: string; name?: string; nameAr?: string; city?: string };
        centerMap.set(row.id, { nameAr: row.nameAr, name: row.name, city: row.city });
      }
    }

    const invites = (rows ?? []).map((r: Record<string, unknown>) => {
      const mc = centerMap.get(r.medicalCenterId as string);
      const name = mc?.nameAr || mc?.name || "مركز طبي";
      const svc = r.patientFeeServiceType === "EXAMINATION" ? "EXAMINATION" : "CONSULTATION";
      return {
        id: r.id as string,
        status: r.status,
        consultationFee: Number(r.consultationFee ?? 0),
        doctorClinicFee: Number(r.doctorClinicFee ?? 0),
        patientFeeServiceType: svc,
        createdAt: r.createdAt,
        centerName: name,
        centerCity: mc?.city ?? "",
      };
    });

    return NextResponse.json({ invites });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

const patchSchema = z.object({
  inviteId: z.string().min(1),
  action: z.enum(["accept", "reject"]),
  /** عند القبول: الطبيب يعدّل مستحقاته من العيادة فقط؛ رسوم المريض ونوع الخدمة من الدعوة */
  doctorClinicFee: z.coerce.number().min(0).optional(),
});

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = patchSchema.parse(body);
    const { inviteId, action } = parsed;

    const { data: doctor, error: dErr } = await supabaseAdmin
      .from("Doctor")
      .select("id, medicalCenterId")
      .eq("userId", session.user.id)
      .single();

    if (dErr || !doctor) {
      return NextResponse.json({ error: "ملف الطبيب غير موجود" }, { status: 404 });
    }

    const doctorId = (doctor as { id: string }).id;
    const currentCenterId = (doctor as { medicalCenterId?: string | null }).medicalCenterId;

    const { data: invite, error: iErr } = await supabaseAdmin
      .from("MedicalCenterDoctorInvite")
      .select("*")
      .eq("id", inviteId)
      .eq("doctorId", doctorId)
      .single();

    if (iErr || !invite) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    if ((invite as { status: string }).status !== "PENDING") {
      return NextResponse.json({ error: "تم الرد على هذا الطلب مسبقاً" }, { status: 400 });
    }

    const centerId = (invite as { medicalCenterId: string }).medicalCenterId;

    if (action === "reject") {
      const { error: uErr } = await supabaseAdmin
        .from("MedicalCenterDoctorInvite")
        .update({ status: "REJECTED", respondedAt: new Date().toISOString() })
        .eq("id", inviteId);
      if (uErr) {
        console.error(uErr);
        return NextResponse.json({ error: "تعذر حفظ الرفض" }, { status: 500 });
      }
      return NextResponse.json({ message: "تم رفض الطلب" });
    }

    if (currentCenterId && currentCenterId !== centerId) {
      return NextResponse.json(
        { error: "أنت مرتبط بمركز طبي آخر. لا يمكن قبول هذا الطلب." },
        { status: 409 }
      );
    }

    let slots: ProposedSlot[];
    try {
      slots = JSON.parse((invite as { proposedTimeSlotsJson: string }).proposedTimeSlotsJson) as ProposedSlot[];
    } catch {
      return NextResponse.json({ error: "بيانات الأوقات غير صالحة" }, { status: 500 });
    }

    if (!Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json({ error: "لا توجد أوقات عمل في الطلب" }, { status: 400 });
    }

    const { data: centerRow } = await supabaseAdmin
      .from("MedicalCenter")
      .select("subscriptionEndDate")
      .eq("id", centerId)
      .single();

    const subEnd = (centerRow as { subscriptionEndDate?: string | null } | null)?.subscriptionEndDate ?? null;

    const mainClinic = await getOrCreateMainClinicForCenterDoctor(doctorId, centerId);
    if (!mainClinic) {
      return NextResponse.json({ error: "تعذر إنشاء عيادة المركز" }, { status: 500 });
    }

    const { count: existingSlots } = await supabaseAdmin
      .from("TimeSlot")
      .select("id", { count: "exact", head: true })
      .eq("clinicId", mainClinic.id);

    if ((existingSlots ?? 0) > 0) {
      return NextResponse.json(
        { error: "عيادة هذا المركز تحتوي أوقاتاً مسجّلة مسبقاً. لا يمكن إكمال الطلب تلقائياً." },
        { status: 409 }
      );
    }

    const slotRows = slots.map((s) => ({
      doctorId,
      clinicId: mainClinic.id,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      isActive: true,
      slotCapacity: Math.min(50, Math.max(1, s.slotCapacity ?? 1)),
    }));

    const { error: slotErr } = await supabaseAdmin.from("TimeSlot").insert(slotRows);
    if (slotErr) {
      console.error(slotErr);
      return NextResponse.json({ error: "تعذر حفظ أوقات العمل" }, { status: 500 });
    }

    const invRec = invite as Record<string, unknown>;
    const toNum = (v: unknown, fb = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : fb;
    };
    const finalConsultation = toNum(
      invRec.consultationFee ?? invRec.consultation_fee,
      0
    );
    const finalDoctorClinic =
      parsed.doctorClinicFee !== undefined
        ? parsed.doctorClinicFee
        : toNum(invRec.doctorClinicFee ?? invRec.doctor_clinic_fee, 0);
    const svcRaw = invRec.patientFeeServiceType ?? invRec.patient_fee_service_type;
    const finalSvc = svcRaw === "EXAMINATION" ? "EXAMINATION" : "CONSULTATION";

    const { error: docUpErr } = await supabaseAdmin
      .from("Doctor")
      .update({
        medicalCenterId: centerId,
        consultationFee: finalConsultation,
        doctorClinicFee: finalDoctorClinic,
        patientFeeServiceType: finalSvc,
        subscriptionEndDate: subEnd,
        subscriptionPeriod: "yearly",
      })
      .eq("id", doctorId);

    if (docUpErr) {
      console.error(docUpErr);
      return NextResponse.json({ error: "تعذر تحديث ملف الطبيب" }, { status: 500 });
    }

    const { error: invErr } = await supabaseAdmin
      .from("MedicalCenterDoctorInvite")
      .update({ status: "ACCEPTED", respondedAt: new Date().toISOString() })
      .eq("id", inviteId);

    if (invErr) {
      console.error(invErr);
      return NextResponse.json({ error: "تعذر إتمام القبول" }, { status: 500 });
    }

    return NextResponse.json({ message: "تم القبول وإضافة عيادة المركز وأوقات العمل" });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
