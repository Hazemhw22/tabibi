/**
 * إرسال رسالة SMS للمريض عند إضافة دفعة أو خدمة.
 * يستخدم Twilio REST API إذا وُجدت المتغيرات: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 * إذا لم تُضبط، لا يتم إرسال أي رسالة ولا يفشل الطلب.
 *
 * للتشخيص: راقب الطرفية (Terminal) حيث يعمل npm run dev — تظهر سطور [SMS] توضح:
 * هل الرقم صالح، هل Twilio مضبوط، الرقم المُرسل إليه، ونتيجة Twilio.
 */

/**
 * تحويل رقم محلي إلى E.164 لفلسطين (972).
 * أمثلة: 0599123456 → +972599123456 ، 599123456 → +972599123456
 */
export function normalizePhoneForSms(phone: string | null | undefined): string | null {
  if (phone == null || typeof phone !== "string") return null;
  const raw = String(phone).trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9) return null;
  if (raw.startsWith("+")) return raw;
  if (digits.startsWith("972")) return `+${digits}`;
  if (digits.startsWith("0") && digits.length >= 10) return `+972${digits.slice(1)}`;
  if (digits.length >= 9) return `+972${digits}`;
  return `+${digits}`;
}

/**
 * إرسال SMS إلى رقم الهاتف عبر Twilio REST API.
 * @returns true إذا تم الإرسال أو إذا SMS غير مضبوط (لا خطأ)، false عند فشل الإرسال.
 */
export async function sendSms(to: string, body: string): Promise<boolean> {
  const normalized = normalizePhoneForSms(to);
  if (!normalized) {
    console.warn("[SMS] رقم غير صالح أو فارغ، تم تخطي الإرسال. الرقم المدخل:", JSON.stringify(to));
    return true;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !fromNumber) {
    console.warn(
      "[SMS] Twilio غير مضبوط. أضف TWILIO_ACCOUNT_SID و TWILIO_AUTH_TOKEN و TWILIO_PHONE_NUMBER إلى ملف .env.local ثم أعد تشغيل السيرفر (npm run dev)."
    );
    return true;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  try {
    const form = new URLSearchParams({
      To: normalized,
      From: fromNumber,
      Body: body,
    });
    console.log("[SMS] جاري الإرسال إلى:", normalized, "(من:", fromNumber + ")");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const resText = await res.text();
    if (!res.ok) {
      console.error("[SMS] Twilio خطأ:", res.status, resText);
      return false;
    }
    console.log("[SMS] تم إرسال الرسالة بنجاح إلى", normalized);
    return true;
  } catch (err) {
    console.error("[SMS] خطأ في الإرسال:", err);
    return false;
  }
}

/** بناء نص رسالة دفعة أو خدمة للمريض */
export function buildTransactionSmsMessage(options: {
  type: "PAYMENT" | "SERVICE";
  amount: number;
  description: string;
  doctorName?: string;
}): string {
  const { type, amount, description, doctorName } = options;
  const name = doctorName ? ` د. ${doctorName}` : "";
  if (type === "PAYMENT") {
    return `Tabibi: تم تسجيل دفعة قدرها ₪${amount} في ملفك لدى${name}. ${description || ""}`.trim();
  }
  return `Tabibi: تم تسجيل خدمة (${description}) بقيمة ₪${amount} في ملفك لدى${name}.`.trim();
}

/**
 * إرسال رسالة واتساب للمريض عبر Twilio WhatsApp API.
 * يتطلب: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM (مثل whatsapp:+14155238886)
 * @returns true إذا تم الإرسال أو إذا الواتساب غير مضبوط، false عند فشل الإرسال.
 */
export async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  const normalized = normalizePhoneForSms(to);
  if (!normalized) {
    console.warn("[WhatsApp] رقم غير صالح، تم تخطي الإرسال. الرقم:", JSON.stringify(to));
    return true;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromWhatsApp = process.env.TWILIO_WHATSAPP_FROM; // e.g. whatsapp:+14155238886
  if (!accountSid || !authToken || !fromWhatsApp) {
    console.warn(
      "[WhatsApp] Twilio WhatsApp غير مضبوط. أضف TWILIO_WHATSAPP_FROM (مثل whatsapp:+14155238886) إلى .env.local"
    );
    return true;
  }

  const toWhatsApp = normalized.startsWith("+") ? `whatsapp:${normalized}` : `whatsapp:+${normalized}`;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  try {
    const form = new URLSearchParams({
      To: toWhatsApp,
      From: fromWhatsApp,
      Body: body,
    });
    console.log("[WhatsApp] جاري الإرسال إلى:", toWhatsApp);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const resText = await res.text();
    if (!res.ok) {
      console.error("[WhatsApp] Twilio خطأ:", res.status, resText);
      return false;
    }
    console.log("[WhatsApp] تم إرسال الرسالة بنجاح إلى", toWhatsApp);
    return true;
  } catch (err) {
    console.error("[WhatsApp] خطأ في الإرسال:", err);
    return false;
  }
}
