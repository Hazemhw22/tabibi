import { findOrCreatePatientByPhone, normalizePatientPhone } from "@/lib/patient-account";
import { generatePasswordRecoveryLink } from "@/lib/auth-recovery";
import { sendSms, sendWhatsApp } from "@/lib/sms";
import { supabaseAdmin } from "@/lib/supabase-admin";

function buildPasswordSetupSms(link: string): string {
  return `Tabibi: تم ربط رقمك بحساب على المنصة. اضبط كلمة المرور من الرابط:\n${link}`;
}

/**
 * بعد إنشاء سجل مريض عيادة: ربط User (مريض) وإرسال SMS/واتساب برابط تعيين كلمة المرور.
 * لا يرمي خطأ — يُسجّل في الطرفية عند الفشل حتى لا تفشل إضافة المريض.
 */
export async function linkClinicPatientAndSendPasswordSetup(options: {
  clinicPatientId: string;
  patientName: string;
  phoneRaw: string;
}): Promise<{ userId: string | null; setupSmsSent: boolean | null }> {
  const { clinicPatientId, patientName, phoneRaw } = options;
  const digits = phoneRaw.replace(/\D/g, "");
  if (digits.length < 9) {
    return { userId: null, setupSmsSent: null };
  }

  const acc = await findOrCreatePatientByPhone(patientName, phoneRaw);
  if ("error" in acc) {
    console.warn("[clinic-patient-invite] تجاهل ربط الحساب:", acc.error);
    return { userId: null, setupSmsSent: null };
  }

  const { error: upErr } = await supabaseAdmin
    .from("ClinicPatient")
    .update({ userId: acc.id })
    .eq("id", clinicPatientId);

  if (upErr) {
    console.error("[clinic-patient-invite] تحديث userId:", upErr);
    return { userId: acc.id, setupSmsSent: false };
  }

  const { email } = normalizePatientPhone(phoneRaw);
  const link = await generatePasswordRecoveryLink(email);
  if (!link) {
    console.warn("[clinic-patient-invite] لم يُولَّد رابط الاستعادة");
    return { userId: acc.id, setupSmsSent: false };
  }

  const body = buildPasswordSetupSms(link);
  let sent = await sendWhatsApp(phoneRaw, body);
  if (!sent) {
    sent = await sendSms(phoneRaw, body);
  }

  return { userId: acc.id, setupSmsSent: sent };
}
