import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "fallback_secret_for_jwt";

export async function POST(req: Request) {
  try {
    const { phone, token } = await req.json();
    if (!phone || !token) {
      return NextResponse.json({ error: "رقم الهاتف ورمز التحقق مطلوبان" }, { status: 400 });
    }

    // 1. Verify the OTP from the VerificationToken table
    const { data: vToken, error: vError } = await supabaseAdmin
      .from("VerificationToken")
      .select("*")
      .eq("identifier", phone)
      .eq("token", token)
      .single();

    if (vError || !vToken) {
      return NextResponse.json({ error: "رمز التحقق غير صحيح" }, { status: 400 });
    }

    // Check if expired
    if (new Date(vToken.expires) < new Date()) {
      return NextResponse.json({ error: "انتهت صلاحية رمز التحقق" }, { status: 400 });
    }

    // 2. Delete the token after successful verification
    await supabaseAdmin
      .from("VerificationToken")
      .delete()
      .eq("identifier", phone)
      .eq("token", token);

    // Clean the phone number to create variations for a robust lookup
    const cleanPhone = phone.replace(/\D/g, "");
    const variations = [
      phone,
      cleanPhone,
      `+${cleanPhone}`,
      cleanPhone.replace(/^(972|970)/, "0")
    ];

    // Look up the existing User in our DB using the variations
    const { data: dbUser } = await supabaseAdmin
      .from("User")
      .select("id, name, phone, email, role, image")
      .in("phone", variations)
      .limit(1)
      .maybeSingle();

    // If the user doesn't exist in our custom User table, we can create one or handle it
    let finalUser = dbUser;
    if (!dbUser) {
      const { data: newUser, error: createError } = await supabaseAdmin
        .from("User")
        .insert({
          phone: phone,
          role: "PATIENT",
          name: "مريض جديد",
        })
        .select()
        .single();
      
      if (!createError && newUser) {
         finalUser = newUser;
      }
    }

    // Generate our JWT token for mobile app to send in Authorization header
    const jwtToken = jwt.sign(
      {
        id: finalUser?.id,
        phone: finalUser?.phone || phone,
        role: finalUser?.role || "PATIENT",
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    return NextResponse.json({
      success: true,
      token: jwtToken,
      user: {
        id: finalUser?.id,
        name: finalUser?.name || "مريض",
        phone: finalUser?.phone || phone,
        role: finalUser?.role || "PATIENT",
        image: finalUser?.image,
      }
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
