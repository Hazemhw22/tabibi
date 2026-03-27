import { getFollowUpVisitsFromPlanData } from "@/lib/care-plan-follow-ups";
import { getAppointmentFinanceSnapshot } from "@/lib/medical-center-finance";
import { supabaseAdmin } from "@/lib/supabase-admin";

function normalizeHHMM(raw: string | undefined): string {
  const t = (raw ?? "").trim();
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return "09:00";
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function add30Min(startTime: string): string {
  const [h, min] = startTime.split(":").map((x) => parseInt(x, 10));
  let total = h * 60 + min + 30;
  if (total >= 24 * 60) total = 24 * 60 - 1;
  const eh = Math.floor(total / 60);
  const em = total % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}

/**
 * يزيل مواعيد «خطة العلاج» السابقة ويُنشئ صفوف Appointment حتى تظهر للمريض في لوحته.
 * يُستدعى بعد حفظ خطة العلاج عندما يكون للمريض حساب منصة (patientUserId).
 */
export async function syncCarePlanFollowUpsToAppointments(options: {
  patientUserId: string;
  doctorId: string;
  planData: Record<string, unknown>;
  planType: string;
}): Promise<void> {
  const { patientUserId, doctorId, planData, planType } = options;
  const visits = getFollowUpVisitsFromPlanData(planData, planType);

  const { error: delErr } = await supabaseAdmin
    .from("Appointment")
    .delete()
    .eq("patientId", patientUserId)
    .eq("doctorId", doctorId)
    .not("carePlanFollowUpId", "is", null);

  if (delErr) {
    console.error("[care-plan-appointment-sync] delete:", delErr);
    return;
  }

  const fin = await getAppointmentFinanceSnapshot(doctorId);
  const fee = Math.max(0, Number(fin.consultationFeeSnapshot ?? 0));

  for (const v of visits) {
    if (!v.date?.trim()) continue;
    const d = new Date(`${v.date.trim()}T12:00:00`);
    if (Number.isNaN(d.getTime())) continue;

    const startTime = normalizeHHMM(v.time);
    const endTime = add30Min(startTime);
    const parts: string[] = ["موعد متابعة من خطة العلاج"];
    if (v.slot?.trim()) parts.push(`الدور: ${v.slot.trim()}`);
    if (v.note?.trim()) parts.push(v.note.trim());
    const notes = parts.join(" — ");

    const row: Record<string, unknown> = {
      patientId: patientUserId,
      doctorId,
      appointmentDate: d.toISOString(),
      startTime,
      endTime,
      status: "CONFIRMED",
      paymentStatus: "UNPAID",
      fee,
      notes,
      carePlanFollowUpId: v.id,
      clinicId: null,
      timeSlotId: null,
    };
    if (fin.medicalCenterId) {
      row.medicalCenterId = fin.medicalCenterId;
      row.doctorClinicFeeSnapshot = Number(fin.doctorClinicFeeSnapshot ?? 0);
    }

    const { error: insErr } = await supabaseAdmin.from("Appointment").insert(row);
    if (insErr) {
      console.error("[care-plan-appointment-sync] insert:", insErr);
    }
  }
}
