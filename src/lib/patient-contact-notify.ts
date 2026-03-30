import {
  sendSmsAndWhatsAppToSameNumber,
  deliveryAnyChannelSucceeded,
} from "@/lib/sms";

/** إرسال SMS وواتساب (Twilio) إلى نفس الرقم عند التفعيل — أولوية phone ثم المرتبط ثم حقل واتساب في السجل. */
export async function sendToClinicPatientPhoneOrWhatsapp(options: {
  /** حقل phone في ClinicPatient */
  clinicPhone: string | null | undefined;
  whatsapp: string | null | undefined;
  /** رقم من User.phone عند ربط المريض بحساب */
  fallbackUserPhone: string | null | undefined;
  message: string;
}): Promise<boolean | null> {
  const patientWhatsapp = String(options.whatsapp ?? "").trim();
  const clinicPhone = String(options.clinicPhone ?? "").trim();
  const fallback = String(options.fallbackUserPhone ?? "").trim();
  const primary = clinicPhone || fallback || patientWhatsapp;
  if (!primary) return null;

  const r = await sendSmsAndWhatsAppToSameNumber(primary, options.message);
  return deliveryAnyChannelSucceeded(r);
}
