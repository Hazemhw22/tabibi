import { findOrCreatePatientByPhone } from "@/lib/patient-account";
import { sendSmsAndWhatsAppToSameNumber, deliveryAnyChannelSucceeded } from "@/lib/sms";
import { supabaseAdmin } from "@/lib/supabase-admin";

function buildNewAccountSms(): string {
  return `Tabibi: تم إنشاء حسابك على المنصة. كلمة المرور هي أرقام رقم هاتفك فقط (بدون مسافات). يمكنك تسجيل الدخول من التطبيق أو الموقع.`;
}

function buildLinkedExistingSms(): string {
  return `Tabibi: تم ربط ملفك في عيادة الطبيب على المنصة.`;
}

/** إشعار واتساب/SMS عند ربط ملف عيادة بحساب مريض موجود مسبقاً */
export async function notifyClinicPatientLinkedExisting(phoneRaw: string): Promise<boolean> {
  const digits = phoneRaw.replace(/\D/g, "");
  if (digits.length < 9) return false;
  const body = buildLinkedExistingSms();
  const r = await sendSmsAndWhatsAppToSameNumber(phoneRaw, body);
  return deliveryAnyChannelSucceeded(r);
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

  const body = acc.created ? buildNewAccountSms() : buildLinkedExistingSms();
  const r = await sendSmsAndWhatsAppToSameNumber(phoneRaw, body);
  const sent = deliveryAnyChannelSucceeded(r);

  return { userId: acc.id, setupSmsSent: sent };
}
