import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendSms, normalizePhoneForSms } from "@/lib/sms";

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();
    if (!phone) {
      return NextResponse.json({ error: "رقم الهاتف مطلوب" }, { status: 400 });
    }

    const normalized = normalizePhoneForSms(phone);
    if (!normalized) {
      return NextResponse.json({ error: "رقم هاتف غير صالح" }, { status: 400 });
    }

    // 1. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 2. Save/Update in VerificationToken
    // identifier = normalized phone, token = otp
    const { error: dbError } = await supabaseAdmin
      .from("VerificationToken")
      .upsert({
        identifier: phone, // using the raw phone as identifier to match auth logic
        token: otp,
        expires: expires.toISOString(),
      }, { onConflict: "identifier,token" });

    if (dbError) {
      console.error("[OTP-Send] DB Error:", dbError);
      return NextResponse.json({ error: "فشل إنشاء رمز التحقق" }, { status: 500 });
    }

    // 3. Send SMS
    const message = `Tabibi: رمز التحقق الخاص بك هو ${otp}. صالح لمدة 10 دقائق.`;
    const sent = await sendSms(normalized, message);

    if (!sent) {
      // If SMS fails but we are in dev/proxy mode, we might still want to return success for testing
      // but in a real scenario, this is an error.
      console.error("[OTP-Send] SMS delivery failed");
      return NextResponse.json({ error: "فشل إرسال الرسالة النصية" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[OTP-Send] unexpected error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
