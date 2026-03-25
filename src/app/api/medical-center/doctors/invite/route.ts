import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { assertMedicalCenterApproved } from "@/lib/medical-center-auth";
import { z } from "zod";

function normalizeTimeToHHMM(s: string): string {
  const t = String(s).trim();
  const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return t;
  const h = m[1].padStart(2, "0");
  const min = m[2];
  return `${h}:${min}`;
}

const feeServiceTypeSchema = z.enum(["CONSULTATION", "EXAMINATION"]);

const inviteSchema = z.object({
  doctorId: z.string().min(1),
  consultationFee: z.coerce.number().min(0),
  doctorClinicFee: z.coerce.number().min(0).optional(),
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
        slotCapacity: z.coerce.number().int().min(1).max(50).optional(),
      })
    )
    .min(1),
});

/** إنشاء طلب ربط لطبيب مسجّل — ينتظر موافقة الطبيب */
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
    const data = inviteSchema.parse(body);

    const { data: doctor, error: dErr } = await supabaseAdmin
      .from("Doctor")
      .select("id, medicalCenterId, status")
      .eq("id", data.doctorId)
      .single();

    if (dErr || !doctor) {
      return NextResponse.json({ error: "الطبيب غير موجود" }, { status: 404 });
    }

    if ((doctor as { status?: string }).status !== "APPROVED") {
      return NextResponse.json({ error: "الطبيب غير معتمد في المنصة" }, { status: 400 });
    }

    const mid = (doctor as { medicalCenterId?: string | null }).medicalCenterId;
    if (mid === centerId) {
      return NextResponse.json({ error: "هذا الطبيب مرتبط بمركزك بالفعل" }, { status: 400 });
    }
    if (mid) {
      return NextResponse.json({ error: "الطبيب مرتبط بمركز طبي آخر" }, { status: 400 });
    }

    const { data: existingPending } = await supabaseAdmin
      .from("MedicalCenterDoctorInvite")
      .select("id")
      .eq("medicalCenterId", centerId)
      .eq("doctorId", data.doctorId)
      .eq("status", "PENDING")
      .maybeSingle();

    if (existingPending) {
      return NextResponse.json({ error: "يوجد طلب معلّق بالفعل لهذا الطبيب" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const payload = {
      id,
      medicalCenterId: centerId,
      doctorId: data.doctorId,
      status: "PENDING",
      consultationFee: data.consultationFee,
      doctorClinicFee: data.doctorClinicFee ?? 0,
      patientFeeServiceType: data.patientFeeServiceType ?? "CONSULTATION",
      proposedTimeSlotsJson: JSON.stringify(
        data.timeSlots.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          slotCapacity: s.slotCapacity ?? 1,
        }))
      ),
    };

    const { error: insErr } = await supabaseAdmin.from("MedicalCenterDoctorInvite").insert(payload);

    if (insErr) {
      console.error(insErr);
      return NextResponse.json(
        {
          error:
            "تعذر حفظ الطلب. تأكد من تشغيل ترحيل قاعدة البيانات (جدول MedicalCenterDoctorInvite وعمود Clinic.medicalCenterId).",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "تم إرسال الطلب. سيظهر للطبيب للموافقة أو الرفض.",
      inviteId: id,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      const first = e.issues[0];
      return NextResponse.json({ error: first?.message ?? "بيانات غير صالحة" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
