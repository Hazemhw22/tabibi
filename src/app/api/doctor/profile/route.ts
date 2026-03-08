import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { z } from "zod";

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { data: doctor, error: docError } = await supabaseAdmin
      .from("Doctor")
      .select("*, specialty:Specialty(*), clinics:Clinic(*), timeSlots:TimeSlot(*)")
      .eq("userId", session.user.id)
      .single();

    if (docError || !doctor) {
      return NextResponse.json({ error: "الطبيب غير موجود" }, { status: 404 });
    }

    const timeSlots = (doctor.timeSlots ?? []).sort(
      (a: { dayOfWeek: number }, b: { dayOfWeek: number }) => a.dayOfWeek - b.dayOfWeek
    );

    return NextResponse.json({
      doctor: {
        ...doctor,
        timeSlots,
      },
    });
  } catch (error) {
    console.error("Get doctor profile error:", error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

const clinicSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  address: z.string(),
  city: z.string().default("الخليل"),
  phone: z.string().optional(),
  isMain: z.boolean().default(false),
});

const timeSlotSchema = z.object({
  id: z.string().optional(),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
});

const updateSchema = z.object({
  bio: z.string().optional(),
  experienceYears: z.number().min(0).optional(),
  consultationFee: z.number().min(0).optional(),
  clinics: z.array(clinicSchema).optional(),
  timeSlots: z.array(timeSlotSchema).optional(),
  specialtyId: z.string().optional(),
  newSpecialtyName: z.string().optional(),
});

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await req.json();
    const data = updateSchema.parse(body);

    const { data: doctor, error: findErr } = await supabaseAdmin
      .from("Doctor")
      .select("id")
      .eq("userId", session.user.id)
      .single();

    if (findErr || !doctor) {
      return NextResponse.json({ error: "الطبيب غير موجود" }, { status: 404 });
    }

    // معالجة التخصص (اختيار أو إضافة جديد)
    let finalSpecialtyId: string | undefined = data.specialtyId;
    if (data.newSpecialtyName && data.newSpecialtyName.trim()) {
      const trimmed = data.newSpecialtyName.trim();
      const { data: newSpec, error: insertSpecErr } = await supabaseAdmin
        .from("Specialty")
        .insert({
          name: trimmed.toLowerCase().replace(/\s+/g, "-"),
          nameAr: trimmed,
          icon: "🩺",
        })
        .select("id")
        .single();
      if (insertSpecErr || !newSpec) {
        console.error("Insert new specialty error:", insertSpecErr);
        return NextResponse.json({ error: "فشل إضافة التخصص الجديد" }, { status: 500 });
      }
      finalSpecialtyId = newSpec.id;
    }

    const updatePayload: {
      bio?: string;
      experienceYears?: number;
      consultationFee?: number;
      specialtyId?: string;
      updatedAt?: string;
    } = {};
    if (data.bio !== undefined) updatePayload.bio = data.bio;
    if (data.experienceYears !== undefined) updatePayload.experienceYears = data.experienceYears;
    if (data.consultationFee !== undefined) updatePayload.consultationFee = data.consultationFee;
    if (finalSpecialtyId) updatePayload.specialtyId = finalSpecialtyId;
    updatePayload.updatedAt = new Date().toISOString();

    const { error: updateErr } = await supabaseAdmin
      .from("Doctor")
      .update(updatePayload)
      .eq("id", doctor.id);

    if (updateErr) {
      console.error("Update doctor error:", updateErr);
      return NextResponse.json({ error: "فشل تحديث الملف" }, { status: 500 });
    }

    if (data.clinics) {
      const { data: existingClinics } = await supabaseAdmin
        .from("Clinic")
        .select("id")
        .eq("doctorId", doctor.id);
      const clinicIds = (existingClinics ?? []).map((c: { id: string }) => c.id);
      if (clinicIds.length > 0) {
        await supabaseAdmin.from("Appointment").update({ clinicId: null }).in("clinicId", clinicIds);
      }
      const { error: deleteClinicsErr } = await supabaseAdmin
        .from("Clinic")
        .delete()
        .eq("doctorId", doctor.id);
      if (deleteClinicsErr) {
        console.error("Delete clinics error:", deleteClinicsErr);
        return NextResponse.json({ error: "فشل تحديث العيادات: " + (deleteClinicsErr.message || "خطأ في الحذف") }, { status: 500 });
      }
      const validClinics = data.clinics.filter((c) => (c.name?.trim() ?? "") !== "" && (c.address?.trim() ?? "") !== "");
      if (validClinics.length > 0) {
        const clinicRows = validClinics.map((c) => ({
          doctorId: doctor.id,
          name: c.name.trim(),
          address: c.address.trim(),
          city: (c.city ?? "الخليل").trim(),
          phone: (c.phone ?? "").trim() || null,
          isMain: c.isMain ?? false,
        }));
        const { error: clinicErr } = await supabaseAdmin.from("Clinic").insert(clinicRows);
        if (clinicErr) {
          console.error("Insert clinics error:", clinicErr);
          return NextResponse.json({ error: "فشل حفظ العيادات: " + (clinicErr.message || "خطأ في الإدراج") }, { status: 500 });
        }
      }
    }

    if (data.timeSlots) {
      const { data: existingSlots } = await supabaseAdmin
        .from("TimeSlot")
        .select("id")
        .eq("doctorId", doctor.id);
      const slotIds = (existingSlots ?? []).map((s: { id: string }) => s.id);
      if (slotIds.length > 0) {
        await supabaseAdmin.from("Appointment").update({ timeSlotId: null }).in("timeSlotId", slotIds);
      }
      const { error: deleteSlotsErr } = await supabaseAdmin
        .from("TimeSlot")
        .delete()
        .eq("doctorId", doctor.id);
      if (deleteSlotsErr) {
        console.error("Delete timeSlots error:", deleteSlotsErr);
        return NextResponse.json({ error: "فشل تحديث جدول المواعيد: " + (deleteSlotsErr.message || "خطأ في الحذف") }, { status: 500 });
      }
      if (data.timeSlots.length > 0) {
        const slotRows = data.timeSlots.map((s) => ({
          doctorId: doctor.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          isActive: true,
        }));
        const { error: slotErr } = await supabaseAdmin.from("TimeSlot").insert(slotRows);
        if (slotErr) {
          console.error("Insert timeSlots error:", slotErr);
          return NextResponse.json({ error: "فشل حفظ المواعيد: " + (slotErr.message || "خطأ في الإدراج") }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ message: "تم الحفظ بنجاح" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    console.error("Update doctor profile error:", error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
