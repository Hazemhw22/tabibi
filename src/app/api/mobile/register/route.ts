import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendSms } from "@/lib/sms";

export async function POST(req: Request) {
  try {
    const { name, phone, email } = await req.json();

    if (!phone || !name) {
      return NextResponse.json({ error: "الاسم ورقم الهاتف مطلوبان" }, { status: 400 });
    }

    // 1. Check if user already exists using Supabase
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from("User")
      .select("id")
      .eq("phone", phone)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: "المستخدم موجود بالفعل" }, { status: 400 });
    }

    // 2. Create the user in Supabase
    const finalEmail = email || `${phone.replace("+", "")}@tabibi.app`;
    
    const { error: insertError } = await supabaseAdmin
      .from("User")
      .insert({
        name,
        phone,
        email: finalEmail,
        role: "PATIENT",
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    // 3. Generate a 6-digit random code for verification
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 4. Store the OTP in VerificationToken table
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

    // 5. Send OTP via Astra
    const smsSent = await sendSms(phone, `طبيبي: رمز التحقق الخاص بك هو ${otpCode}`);
    
    if (!smsSent) {
      return NextResponse.json({ error: "فشل في إرسال الرسالة القصيرة" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "تم إنشاء الحساب وإرسال رمز التحقق لهاتفك بنجاح" 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
