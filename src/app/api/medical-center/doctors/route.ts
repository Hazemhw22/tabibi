import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { assertMedicalCenterApproved, getMedicalCenterIdForUser } from "@/lib/medical-center-auth";
import { getOrCreateMainClinicForCenterDoctor } from "@/lib/medical-center-clinic";
import { z } from "zod";

/** يقبل 9:00 أو 09:00:00 ويحوّل إلى HH:mm */
function normalizeTimeToHHMM(s: string): string {
  const t = String(s).trim();
  const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return t;
  const h = m[1].padStart(2, "0");
  const min = m[2];
  return `${h}:${min}`;
}

const feeServiceTypeSchema = z.enum(["CONSULTATION", "EXAMINATION"]);

const createDoctorSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().min(9),
  specialtyId: z.string().min(1),
  consultationFee: z.coerce.number().min(0),
  /** مستحقات الطبيب من العيادة (حساب الطبيب) */
  doctorClinicFee: z.coerce.number().min(0).optional(),
  /** استشارة طبية أو كشفية — يظهر للمريض بجانب السعر */
  patientFeeServiceType: feeServiceTypeSchema.optional(),
  timeSlots: z
    .array(
      z.object({
        dayOfWeek: z.coerce.number().int().min(0).max(6),
        startTime: z
          .string()
          .transform((v) => normalizeTimeToHHMM(v))
          .pipe(z.string().regex(/^\d{2}:\d{2}$/, "صيغة الوقت غير صالحة")),
        endTime: z
          .string()
          .transform((v) => normalizeTimeToHHMM(v))
          .pipe(z.string().regex(/^\d{2}:\d{2}$/, "صيغة الوقت غير صالحة")),
        /** عدد الحجوزات المسموحة لنفس الدور (نفس الفترة الزمنية) */
        slotCapacity: z.coerce.number().int().min(1).max(50).optional(),
      })
    )
    .min(1),
});

/** أطباء المركز مع أوقات العمل المختصرة — كل المرتبطين بالمركز بغض النظر عن visibleToPatients */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const gate = await assertMedicalCenterApproved(session.user.id);
    if (!gate.ok) return gate.response;
    const centerId = gate.centerId;

    const { data: doctors, error } = await supabaseAdmin
      .from("Doctor")
      .select(`
        id,
        status,
        visibleToPatients,
        consultationFee,
        doctorClinicFee,
        experienceYears,
        user:User(name, phone, email),
        specialty:Specialty(nameAr),
        timeSlots:TimeSlot(id, dayOfWeek, startTime, endTime, isActive, clinicId)
      `)
      .eq("medicalCenterId", centerId)
      .order("createdAt", { ascending: true });

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "تعذر التحميل" }, { status: 500 });
    }

    return NextResponse.json({ doctors: doctors ?? [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

/** إنشاء طبيب جديد مرتبط بالمركز (حساب + ملف طبيب + أوقات عمل) */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const gate = await assertMedicalCenterApproved(session.user.id);
    if (!gate.ok) return gate.response;
    const centerId = gate.centerId;

    const { data: centerRow } = await supabaseAdmin
      .from("MedicalCenter")
      .select("subscriptionEndDate")
      .eq("id", centerId)
      .single();

    const json = await req.json();
    const data = createDoctorSchema.parse(json);
    const email = data.email.trim();

    const { data: existing } = await supabaseAdmin.from("User").select("id").eq("email", email).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "البريد الإلكتروني مسجّل بالفعل" }, { status: 400 });
    }

    const phoneDigits = data.phone.replace(/\D/g, "");
    const normalizedPhone = phoneDigits.slice(-9);
    const canonicalPhone = normalizedPhone.startsWith("0") ? normalizedPhone : "0" + normalizedPhone;

    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email_confirm: true,
      email,
      password: data.password,
      user_metadata: {
        name: data.name,
        phone: canonicalPhone,
        role: "DOCTOR",
      },
    });

    if (authErr || !authData.user?.id) {
      return NextResponse.json({ error: authErr?.message ?? "فشل إنشاء الحساب" }, { status: 400 });
    }

    const userId = authData.user.id;

    const { error: userErr } = await supabaseAdmin.from("User").upsert({
      id: userId,
      email,
      name: data.name,
      phone: canonicalPhone,
      role: "DOCTOR",
    });

    if (userErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      console.error(userErr);
      return NextResponse.json({ error: "فشل حفظ المستخدم" }, { status: 500 });
    }

    const subEnd =
      (centerRow as { subscriptionEndDate?: string | null } | null)?.subscriptionEndDate ?? null;

    const { data: doctorRow, error: docErr } = await supabaseAdmin
      .from("Doctor")
      .insert({
        userId,
        specialtyId: data.specialtyId,
        medicalCenterId: centerId,
        status: "APPROVED",
        experienceYears: 0,
        consultationFee: data.consultationFee,
        doctorClinicFee: data.doctorClinicFee ?? 0,
        patientFeeServiceType: data.patientFeeServiceType ?? "CONSULTATION",
        rating: 0,
        totalReviews: 0,
        visibleToPatients: true,
        subscriptionPeriod: "yearly",
        subscriptionEndDate: subEnd,
        canAddExtraClinics: false,
      })
      .select("id")
      .single();

    if (docErr || !doctorRow) {
      await supabaseAdmin.from("User").delete().eq("id", userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      console.error(docErr);
      return NextResponse.json({ error: "فشل إنشاء ملف الطبيب" }, { status: 500 });
    }

    const mainClinic = await getOrCreateMainClinicForCenterDoctor(doctorRow.id, centerId);
    if (!mainClinic) {
      await supabaseAdmin.from("Doctor").delete().eq("id", doctorRow.id);
      await supabaseAdmin.from("User").delete().eq("id", userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "فشل إنشاء عيادة الطبيب في المركز" }, { status: 500 });
    }

    const slotRows = data.timeSlots.map((s) => ({
      doctorId: doctorRow.id,
      clinicId: mainClinic.id,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      isActive: true,
      slotCapacity: s.slotCapacity ?? 1,
    }));

    const { error: slotErr } = await supabaseAdmin.from("TimeSlot").insert(slotRows);
    if (slotErr) {
      await supabaseAdmin.from("Clinic").delete().eq("id", mainClinic.id);
      await supabaseAdmin.from("Doctor").delete().eq("id", doctorRow.id);
      await supabaseAdmin.from("User").delete().eq("id", userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      console.error(slotErr);
      return NextResponse.json({ error: "فشل حفظ أوقات العمل" }, { status: 500 });
    }

    return NextResponse.json({ doctorId: doctorRow.id, message: "تم إضافة الطبيب" }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      const first = e.issues[0];
      const hint = first ? `${first.path.join(".")}: ${first.message}` : "بيانات غير صالحة";
      return NextResponse.json({ error: hint, details: e.issues }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
