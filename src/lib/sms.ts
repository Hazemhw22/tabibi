/**
 * إرسال رسالة SMS للمريض عند إضافة دفعة أو خدمة.
 * يستخدم Astra API (astra.htd.ps) إذا وُجد SMS_API_ID.
 * للتشخيص: راقب الطرفية حيث يعمل npm run dev — تظهر سطور [SMS].
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

/** تحويل رقم إلى صيغة Astra (970xxxxxxxx) */
function toAstraPhoneFormat(phone: string | null | undefined): string | null {
  const normalized = normalizePhoneForSms(phone);
  if (!normalized) return null;
  const digits = normalized.replace(/\D/g, "");
  if (digits.startsWith("972")) return `970${digits.slice(3)}`;
  if (digits.startsWith("970")) return digits;
  return `970${digits}`;
}

/**
 * إرسال SMS عبر Astra API.
 * .env.local: SMS_API_ID=xxx (مطلوب), SMS_SENDER=Tabibi (اختياري)
 * Production (Vercel): يفضل استخدام SMS_PROXY_URL + SMS_PROXY_SECRET (VPS ثابت IP)
 */
export async function sendSms(to: string, body: string): Promise<boolean> {
  const astraTo = toAstraPhoneFormat(to);
  if (!astraTo) {
    console.warn("[SMS] رقم غير صالح أو فارغ، تم تخطي الإرسال. الرقم المدخل:", JSON.stringify(to));
    return true;
  }

  const proxyUrl = process.env.SMS_PROXY_URL;
  const proxySecret = process.env.SMS_PROXY_SECRET;
  if (proxyUrl) {
    if (!proxySecret) {
      console.warn("[SMS] SMS_PROXY_URL مضبوط لكن SMS_PROXY_SECRET غير مضبوط.");
      return false;
    }
    try {
      const res = await fetch(`${proxyUrl.replace(/\/+$/, "")}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${proxySecret}`,
        },
        body: JSON.stringify({ to: astraTo, msg: body }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("[SMS] Proxy خطأ:", res.status, j);
        return false;
      }
      return true;
    } catch (err) {
      console.error("[SMS] Proxy خطأ في الإرسال:", err);
      return false;
    }
  }

  const apiId = process.env.SMS_API_ID;
  if (!apiId) {
    console.warn(
      "[SMS] Astra SMS غير مضبوط. أضف SMS_API_ID إلى .env.local ثم أعد تشغيل السيرفر."
    );
    return true;
  }

  const sender = process.env.SMS_SENDER || "Tabibi";
  const baseUrl = process.env.SMS_API_URL || "http://astra.htd.ps/API/SendSMS.aspx";
  const url = `${baseUrl}?id=${encodeURIComponent(apiId)}&sender=${encodeURIComponent(sender)}&to=${encodeURIComponent(astraTo)}&msg=${encodeURIComponent(body)}`;

  try {
    console.log("[SMS] جاري الإرسال إلى:", astraTo, "(مرسل:", sender + ")");
    const res = await fetch(url, { method: "GET" });
    const resText = await res.text();
    if (!res.ok) {
      console.error("[SMS] Astra خطأ:", res.status, resText);
      return false;
    }
    console.log("[SMS] تم إرسال الرسالة بنجاح إلى", astraTo);
    return true;
  } catch (err) {
    console.error("[SMS] خطأ في الإرسال:", err);
    return false;
  }
}

/** إشعار قصير عند حفظ خطة علاج لا تُنشئ بنود تكلفة تلقائياً (تصوير جنين، نساء، نماذج دولية…). */
export function buildCarePlanSavedInfoSmsMessage(options: {
  planLabel: string;
  doctorName?: string;
}): string {
  const name = options.doctorName ? ` د. ${options.doctorName}` : "";
  return `Tabibi: تم تحديث ${options.planLabel} لدى${name}. يمكنك مراجعة التفاصيل في حسابك أو التواصل مع العيادة.`.trim();
}

/** نص رسالة عند إضافة تكاليف خطة العلاج للمعاملات (بند أو أكثر) */
export function buildCarePlanNewServicesSmsMessage(options: {
  lines: { description: string; amount: number }[];
  doctorName?: string;
}): string {
  const { lines, doctorName } = options;
  const name = doctorName ? ` د. ${doctorName}` : "";
  const total = lines.reduce((s, l) => s + Math.abs(Number(l.amount) || 0), 0);
  const maxShow = 5;
  const shown = lines.slice(0, maxShow);
  const bullets = shown.map((l) => `• ${l.description}: ₪${Math.round(Math.abs(Number(l.amount) || 0))}`);
  let msg = `Tabibi: تم تسجيل بنود خطة العلاج في ملفك لدى${name}:\n${bullets.join("\n")}`;
  if (lines.length > maxShow) {
    msg += `\n• (+${lines.length - maxShow} بند آخر)`;
  }
  msg += `\nالإجمالي المضاف: ₪${Math.round(total)}`;
  return msg.trim();
}

/** بناء نص رسالة دفعة أو خدمة للمريض */
export function buildTransactionSmsMessage(options: {
  type: "PAYMENT" | "SERVICE";
  amount: number;
  description: string;
  doctorName?: string;
  /** باقي الرصيد بعد المعاملة (للدفعات فقط) */
  balanceAfter?: number;
}): string {
  const { type, amount, description, doctorName, balanceAfter } = options;
  const name = doctorName ? ` د. ${doctorName}` : "";
  if (type === "PAYMENT") {
    let msg = `Tabibi: تم تسجيل دفعة قدرها ₪${amount} في ملفك لدى${name}.`;
    if (description) msg += ` ${description}.`;
    if (balanceAfter !== undefined && balanceAfter !== null) {
      msg += ` باقي الرصيد: ₪${Math.round(balanceAfter)}`;
    }
    return msg.trim();
  }
  return `Tabibi: تم تسجيل خدمة (${description}) بقيمة ₪${amount} في ملفك لدى${name}.`.trim();
}

/** SMS عند تأكيد الطبيب للحجز */
export function buildAppointmentConfirmedSmsMessage(options: {
  doctorName: string;
  dateStr: string;
  timeStr: string;
  clinicName?: string | null;
}): string {
  const { doctorName, dateStr, timeStr, clinicName } = options;
  let msg = `Tabibi: تم تأكيد موعدك مع د. ${doctorName} بتاريخ ${dateStr} الساعة ${timeStr}.`;
  if (clinicName?.trim()) msg += ` العيادة: ${clinicName}.`;
  msg += " نراك قريباً.";
  return msg.trim();
}

/** تذكير تلقائي: يوم قبل الموعد */
export function buildAppointmentReminderSmsMessage(options: {
  doctorName: string;
  dateStr: string;
  timeStr: string;
  clinicName?: string | null;
}): string {
  const { doctorName, dateStr, timeStr, clinicName } = options;
  let msg = `Tabibi: تذكير — موعدك غداً ${dateStr} الساعة ${timeStr} مع د. ${doctorName}.`;
  if (clinicName?.trim()) msg += ` ${clinicName}.`;
  msg += " نرجو الحضور قبل 10 دقائق.";
  return msg.trim();
}

/** هل إعدادات Twilio WhatsApp مكتملة؟ إن لم تكن، لا نعطي أولوية للواتساب ونرسل SMS بدلًا منه. */
export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM
  );
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
