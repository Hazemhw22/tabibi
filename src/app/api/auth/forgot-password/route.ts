import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendSmsAndWhatsAppToSameNumber, deliveryAnyChannelSucceeded } from "@/lib/sms";
import crypto from "crypto";

const bodySchema = z.object({
  action: z.enum(["send-otp", "verify-otp", "reset-password"]),
  phone: z.string().min(3, "الإدخال غير صالح"),
  code: z.string().optional(),
  newPassword: z.string().min(6).optional(),
});

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const last9 = digits.slice(-9);
  return last9; // We use the last 9 digits as identifier to avoid leading zero/972 confusion
}

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
  const normalized = normalizePhone(trimmed);
  return findUserByPhoneNormalized(normalized);
}

async function findUserByPhoneNormalized(normalized: string) {
  const withZero = "0" + normalized;
  const with972 = "972" + normalized;
  
  const { data } = await supabaseAdmin
    .from("User")
    .select("id, email, phone, role")
    .or(`phone.eq.${normalized},phone.eq.${withZero},phone.eq.${with972}`)
    .limit(1)
    .maybeSingle();
  return data;
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { action, phone: login, code, newPassword } = bodySchema.parse(json);

    // 1. Find user first to get their actual phone number for token identifier
    const user = await findUserByLogin(login);
    if (!user || !user.phone) {
      return NextResponse.json({ error: "لم يتم العثور على حساب مرتبط بهذا الإدخال" }, { status: 404 });
    }
    const normalized = normalizePhone(user.phone);

    if (action === "send-otp") {
      const otp = crypto.randomInt(100000, 999999).toString();
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Delete existing tokens for this identifier
      await supabaseAdmin.from("VerificationToken").delete().eq("identifier", normalized);

      // Insert verification token
      const { error: tokenErr } = await supabaseAdmin.from("VerificationToken").insert({
        identifier: normalized,
        token: otp,
        expires: expires.toISOString(),
      });

      if (tokenErr) {
        console.error("Token insert error:", tokenErr);
        return NextResponse.json({ error: "فشل في إنشاء رمز التحقق" }, { status: 500 });
      }

      const smsBody = `Tabibi: رمز التحقق الخاص بك هو ${otp}. صالح لمدة 10 دقائق.`;
      // Always send to the phone found in DB
      const delivery = await sendSmsAndWhatsAppToSameNumber(user.phone, smsBody);
      
      if (!deliveryAnyChannelSucceeded(delivery)) {
        return NextResponse.json({ error: "فشل إرسال رسالة التحقق" }, { status: 500 });
      }

      return NextResponse.json({ ok: true, message: "تم إرسال رمز التحقق بنجاح" });
    }

    if (action === "verify-otp") {
      if (!code) return NextResponse.json({ error: "رمز التحقق مطلوب" }, { status: 400 });

      const { data: tokenData, error: tokenFetchErr } = await supabaseAdmin
        .from("VerificationToken")
        .select("*")
        .eq("identifier", normalized)
        .eq("token", code)
        .gte("expires", new Date().toISOString())
        .maybeSingle();

      if (tokenFetchErr || !tokenData) {
        return NextResponse.json({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية" }, { status: 400 });
      }

      return NextResponse.json({ ok: true, message: "تم التحقق من الرمز" });
    }

    if (action === "reset-password") {
      if (!code || !newPassword) {
        return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
      }

      // 1. Verify OTP again
      const { data: tokenData } = await supabaseAdmin
        .from("VerificationToken")
        .select("*")
        .eq("identifier", normalized)
        .eq("token", code)
        .gte("expires", new Date().toISOString())
        .maybeSingle();

      if (!tokenData) {
        return NextResponse.json({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية" }, { status: 400 });
      }

      // 2. User is already found at the beginning of POST handler

      // 3. Update Password in Supabase Auth
      console.log(`[reset-password] Updating password for userId: ${user.id}, email: ${user.email}`);

      const { data: updateData, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: newPassword,
      });

      if (updateErr) {
        console.error("Supabase password update error details:", updateErr);
        // If ID fail, try searching by email or phone in Auth
        const { data: usersList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const authUser = usersList?.users.find(u => {
          const emailMatch = user.email && u.email?.toLowerCase() === user.email.toLowerCase();
          const phoneMatch = user.phone && (u.phone === user.phone || u.phone === `+${user.phone}` || u.phone?.endsWith(normalized));
          return emailMatch || phoneMatch;
        });
          
        if (authUser) {
          console.log(`[reset-password] Found Auth account with ID ${authUser.id} (Recovered mismatch)`);
          const { error: retryErr } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
            password: newPassword,
          });
          if (!retryErr) {
            await supabaseAdmin.from("User").update({ id: authUser.id }).eq("id", user.id);
            await supabaseAdmin.from("VerificationToken").delete().eq("identifier", normalized).eq("token", code);
            return NextResponse.json({ ok: true, message: "تم تحديث كلمة المرور بنجاح" });
          }
        }
        return NextResponse.json({ error: `فشل تحديث كلمة المرور: ${updateErr.message}` }, { status: 500 });
      }

      // 4. Delete token
      await supabaseAdmin.from("VerificationToken").delete().eq("identifier", normalized).eq("token", code);

      return NextResponse.json({ ok: true, message: "تم تحديث كلمة المرور بنجاح" });
    }

    return NextResponse.json({ error: "Action non valid" }, { status: 400 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
    }
    console.error("forgot-password:", e);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
