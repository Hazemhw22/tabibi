import { sendSms, sendWhatsApp, isWhatsAppConfigured } from "@/lib/sms";

/** إرسال SMS/واتساب لمريض العيادة — نفس منطق مسار المعاملات (تجاهل واتساب إن Twilio غير مضبوط). */
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
  const smsTarget = clinicPhone || fallback || "";

  let smsSent: boolean | null = null;
  if (patientWhatsapp && isWhatsAppConfigured()) {
    smsSent = await sendWhatsApp(patientWhatsapp, options.message);
    if (smsSent === false && smsTarget) {
      smsSent = await sendSms(smsTarget, options.message);
    }
  } else if (smsTarget) {
    smsSent = await sendSms(smsTarget, options.message);
  } else if (patientWhatsapp) {
    smsSent = await sendSms(patientWhatsapp, options.message);
  }
  return smsSent;
}
