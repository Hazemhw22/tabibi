import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendSms } from "@/lib/sms";

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();
    if (!phone) {
      return NextResponse.json({ error: "رقم الهاتف مطلوب" }, { status: 400 });
    }

    // 1. Smart Normalize and check variations
    const cleanPhone = phone.replace(/\D/g, ""); // Remove + and spaces
    
    // Check multiple variations: original, clean, and local (replacing 972/970 with 0)
    const variations = [
      phone,
      cleanPhone,
      `+${cleanPhone}`,
      cleanPhone.replace(/^(972|970)/, "0")
    ];

    const { data: user, error: userError } = await supabaseAdmin
      .from("User")
      .select("id")
      .in("phone", variations)
      .limit(1)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ 
        success: true, 
        exists: false, 
        message: "المستخدم غير موجود، يرجى التسجيل" 
      });
    }

    // 2. Generate a 6-digit random code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 3. Store the OTP in VerificationToken table (Upsert logic)
    // First, clear old tokens for this phone
    await supabaseAdmin
      .from("VerificationToken")
      .delete()
      .eq("identifier", phone);

    const { error: tokenError } = await supabaseAdmin
      .from("VerificationToken")
      .insert({
        identifier: phone,
        token: otpCode,
        expires: expires.toISOString(),
      });

    if (tokenError) {
      return NextResponse.json({ error: "فشل في إنشاء رمز التحقق" }, { status: 500 });
    }

    // 4. Send SMS via Astra
    const smsSent = await sendSms(phone, `طبيبي: رمز التحقق الخاص بك هو ${otpCode}`);
    
    if (!smsSent) {
      return NextResponse.json({ error: "فشل في إرسال الرسالة القصيرة" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      exists: true, 
      message: "تم إرسال رمز التحقق لهاتفك بنجاح" 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
