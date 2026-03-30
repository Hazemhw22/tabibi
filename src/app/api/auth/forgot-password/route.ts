import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generatePasswordRecoveryLink } from "@/lib/auth-recovery";
import { sendPasswordResetEmail } from "@/lib/email";
import { sendSmsAndWhatsAppToSameNumber, deliveryAnyChannelSucceeded } from "@/lib/sms";

const bodySchema = z.object({
  login: z.string().min(1, "أدخل البريد أو رقم الهاتف"),
});

async function findUserByLogin(login: string) {
  const trimmed = login.trim();
  if (trimmed.includes("@")) {
    const { data } = await supabaseAdmin
      .from("User")
      .select("id, email, phone, role")
      .ilike("email", trimmed)
      .maybeSingle();
    return data;
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 9) return null;
  const normalized = digits.slice(-9);
  const withZero = "0" + normalized;
  const with972 = "972" + normalized;
  const { data } = await supabaseAdmin
    .from("User")
    .select("id, email, phone, role")
    .or(`phone.eq.${normalized},phone.eq.${withZero},phone.eq.${with972},phone.eq.${trimmed}`)
    .limit(1)
    .maybeSingle();
  return data;
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { login } = bodySchema.parse(json);

    const user = await findUserByLogin(login);
    const generic = NextResponse.json({
      ok: true,
      message: "إذا كان الحساب مسجّلاً ستصلك رسالة برابط تعيين كلمة مرور جديدة قريباً.",
    });

    if (!user?.email) {
      return generic;
    }

    const link = await generatePasswordRecoveryLink(user.email);
    if (!link) {
      return generic;
    }

    const syntheticEmail = user.email.toLowerCase().endsWith("@tabibi.local");
    if (syntheticEmail) {
      const phone = (user.phone ?? "").trim();
      if (phone) {
        const body = `Tabibi: لاستعادة كلمة المرور افتح الرابط:\n${link}`;
        const delivery = await sendSmsAndWhatsAppToSameNumber(phone, body);
        if (!deliveryAnyChannelSucceeded(delivery)) {
          console.warn("[forgot-password] فشل إرسال SMS/واتساب للمريض", user.id);
        }
      }
    } else {
      const sent = await sendPasswordResetEmail(user.email, link);
      if (!sent) console.warn("[forgot-password] فشل إرسال البريد", user.email);
    }

    return generic;
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
    }
    console.error("forgot-password:", e);
    return NextResponse.json({ ok: true, message: "إذا كان الحساب مسجّلاً ستصلك رسالة قريباً." });
  }
}
