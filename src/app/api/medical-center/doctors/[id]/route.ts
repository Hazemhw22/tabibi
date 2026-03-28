import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { assertApprovedMedicalCenter } from "@/lib/medical-center-auth";
import { CENTER_ROLES_ADMIN_ONLY, CENTER_ROLES_ADMIN_RECEPTION } from "@/lib/medical-center-roles";
import { getOrCreateMainClinicForCenterDoctor } from "@/lib/medical-center-clinic";
import { doctorIsLinkedToCenter } from "@/lib/medical-center-doctors";
import { z } from "zod";

const patchSchema = z.object({
  consultationFee: z.number().min(0).optional(),
  doctorClinicFee: z.number().min(0).optional(),
  specialtyId: z.string().min(1).optional(),
  patientFeeServiceType: z.enum(["CONSULTATION", "EXAMINATION"]).optional(),
  timeSlots: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        slotCapacity: z.number().int().min(1).max(50).optional(),
      })
    )
    .optional(),
});

async function assertCenterDoctor(doctorId: string, centerId: string) {
  return doctorIsLinkedToCenter(doctorId, centerId);
}

/** تفاصيل طبيب ضمن المركز */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const gate = await assertApprovedMedicalCenter(session.user.id, { roles: CENTER_ROLES_ADMIN_RECEPTION });
    if (!gate.ok) return gate.response;
    const centerId = gate.centerId;

    const { id } = await params;
    if (!(await assertCenterDoctor(id, centerId))) {
      return NextResponse.json({ error: "الطبيب غير موجود أو لا يتبع مركزك" }, { status: 404 });
    }

    const { data: doctor, error } = await supabaseAdmin
      .from("Doctor")
      .select(
        `
        id,
        status,
        consultationFee,
        doctorClinicFee,
        patientFeeServiceType,
        experienceYears,
        user:User!Doctor_userId_fkey(name, phone, email),
        specialty:Specialty(id, nameAr),
        timeSlots:TimeSlot(id, dayOfWeek, startTime, endTime, isActive, clinicId, slotCapacity),
        clinics:Clinic(id, name, isMain)
      `
      )
      .eq("id", id)
      .single();

    if (error || !doctor) {
      return NextResponse.json({ error: "تعذر التحميل" }, { status: 500 });
    }

    return NextResponse.json({ doctor });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

/** تحديث الرسوم والتخصص وأوقات العمل (مرتبطة بعيادة المركز الرئيسية) */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const gate = await assertApprovedMedicalCenter(session.user.id, { roles: CENTER_ROLES_ADMIN_ONLY });
    if (!gate.ok) return gate.response;
    const centerId = gate.centerId;

    const { id } = await params;
    if (!(await assertCenterDoctor(id, centerId))) {
      return NextResponse.json({ error: "الطبيب غير موجود أو لا يتبع مركزك" }, { status: 404 });
    }

    const body = await req.json();
    const data = patchSchema.parse(body);

    if (
      data.consultationFee !== undefined ||
      data.specialtyId !== undefined ||
      data.doctorClinicFee !== undefined ||
      data.patientFeeServiceType !== undefined
    ) {
      const update: Record<string, unknown> = {};
      if (data.consultationFee !== undefined) update.consultationFee = data.consultationFee;
      if (data.doctorClinicFee !== undefined) update.doctorClinicFee = data.doctorClinicFee;
      if (data.specialtyId !== undefined) update.specialtyId = data.specialtyId;
      if (data.patientFeeServiceType !== undefined) update.patientFeeServiceType = data.patientFeeServiceType;
      const { error: upErr } = await supabaseAdmin.from("Doctor").update(update).eq("id", id);
      if (upErr) {
        console.error(upErr);
        return NextResponse.json({ error: "فشل تحديث البيانات" }, { status: 500 });
      }
    }

    if (data.timeSlots) {
      const mainClinic = await getOrCreateMainClinicForCenterDoctor(id, centerId);
      if (!mainClinic) {
        return NextResponse.json({ error: "تعذر ربط العيادة الرئيسية" }, { status: 500 });
      }

      const { data: slotsToRemove } = await supabaseAdmin
        .from("TimeSlot")
        .select("id")
        .eq("doctorId", id)
        .or(`clinicId.eq.${mainClinic.id},clinicId.is.null`);

      const slotIds = (slotsToRemove ?? []).map((s) => s.id);
      if (slotIds.length) {
        await supabaseAdmin.from("Appointment").update({ timeSlotId: null }).in("timeSlotId", slotIds);
        await supabaseAdmin.from("TimeSlot").delete().in("id", slotIds);
      }

      if (data.timeSlots.length > 0) {
        const slotRows = data.timeSlots.map((s) => ({
          doctorId: id,
          clinicId: mainClinic.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          isActive: true,
          slotCapacity: s.slotCapacity ?? 1,
        }));
        const { error: insErr } = await supabaseAdmin.from("TimeSlot").insert(slotRows);
        if (insErr) {
          console.error(insErr);
          return NextResponse.json({ error: "فشل تحديث أوقات العمل" }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ message: "تم الحفظ" });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة", details: e.issues }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
