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
  /** باقي الرصيد بعد المعاملة — يظهر في رسالة الدفعة فقط */
  balanceAfter?: number;
}) {
  if (!resend || !apiKey) {
    console.warn("[EMAIL] Resend غير مضبوط (RESEND_API_KEY). تم تخطي الإرسال.");
    return;
  }

  const { to, type, amount, description, doctorName, balanceAfter } = options;
  const friendlyDoctor = doctorName ? `د. ${doctorName}` : "الطبيب";
  const subject =
    type === "PAYMENT"
      ? `تم تسجيل دفعة جديدة في ملفك`
      : `تم تسجيل خدمة طبية جديدة في ملفك`;

  let bodyText =
    type === "PAYMENT"
      ? `تم تسجيل دفعة قدرها ₪${amount} في ملفك عند ${friendlyDoctor}. الوصف: ${description || "-"}`
      : `تم تسجيل خدمة طبية (${description}) بقيمة ₪${amount} في ملفك عند ${friendlyDoctor}.`;
  if (type === "PAYMENT" && balanceAfter !== undefined && balanceAfter !== null) {
    bodyText += ` باقي الرصيد: ₪${Math.round(balanceAfter)}`;
  }

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; padding: 20px; direction: rtl;">
  <p style="font-size: 16px; line-height: 1.6;">${bodyText}</p>
  <p style="font-size: 12px; color: #666;">— Tabibi</p>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
      text: bodyText,
    });
    console.log("[EMAIL] تم إرسال بريد المعاملة إلى", to);
  } catch (err) {
    console.error("[EMAIL] خطأ في إرسال البريد:", err);
  }
}

