import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || "no-reply@example.com";

const resend = apiKey ? new Resend(apiKey) : null;

type TxType = "PAYMENT" | "SERVICE";

export async function sendTransactionEmail(options: {
  to: string;
  type: TxType;
  amount: number;
  description: string;
  doctorName?: string | null;
}) {
  if (!resend || !apiKey) {
    console.warn("[EMAIL] Resend غير مضبوط (RESEND_API_KEY). تم تخطي الإرسال.");
    return;
  }

  const { to, type, amount, description, doctorName } = options;
  const friendlyDoctor = doctorName ? `د. ${doctorName}` : "الطبيب";
  const subject =
    type === "PAYMENT"
      ? `تم تسجيل دفعة جديدة في ملفك`
      : `تم تسجيل خدمة طبية جديدة في ملفك`;

  const body =
    type === "PAYMENT"
      ? `تم تسجيل دفعة قدرها ₪${amount} في ملفك عند ${friendlyDoctor}.<br/>الوصف: ${description || "-"}`
      : `تم تسجيل خدمة طبية (${description}) بقيمة ₪${amount} في ملفك عند ${friendlyDoctor}.`;

  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html: `<p>${body}</p>`,
    });
    console.log("[EMAIL] تم إرسال بريد المعاملة إلى", to);
  } catch (err) {
    console.error("[EMAIL] خطأ في إرسال البريد:", err);
  }
}

