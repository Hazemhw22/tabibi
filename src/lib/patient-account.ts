import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

/** تطبيع رقم الهاتف وبريد المريض الاصطناعي (نفس منطق التسجيل) */
export function normalizePatientPhone(input: string): {
  canonicalPhone: string;
  normalizedPhone: string;
  email: string;
} {
  const phoneDigits = input.replace(/\D/g, "");
  const normalizedPhone = phoneDigits.slice(-9);
  const canonicalPhone = normalizedPhone.startsWith("0")
    ? normalizedPhone
    : "0" + normalizedPhone;
  const email = `phone.${canonicalPhone.replace(/\D/g, "")}@tabibi.local`;
  return { canonicalPhone, normalizedPhone, email };
}

/**
 * يبحث عن مستخدم بدور مريض أو ينشئ حساباً جديداً (للحجز من المركز الطبي).
 * `created: true` عند إنشاء حساب جديد في Auth — مفيد لإرسال رابط ضبط كلمة المرور.
 */
export async function findOrCreatePatientByPhone(
  name: string,
  phoneRaw: string
): Promise<{ id: string; created: boolean } | { error: string }> {
  const { canonicalPhone, normalizedPhone, email } = normalizePatientPhone(phoneRaw);

  const { data: existing } = await supabaseAdmin
    .from("User")
    .select("id, role")
    .or(`phone.eq.${canonicalPhone},phone.eq.${normalizedPhone},phone.eq.972${normalizedPhone}`)
    .maybeSingle();

  if (existing?.id) {
    if (existing.role !== "PATIENT") {
      return { error: "رقم الهاتف مسجّل كحساب ليس مريضاً" };
    }
    await supabaseAdmin.from("User").update({ name }).eq("id", existing.id);
    return { id: existing.id, created: false };
  }

  const password = randomBytes(18).toString("hex");
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email_confirm: true,
    email,
    password,
    user_metadata: {
      name,
      phone: canonicalPhone,
      role: "PATIENT",
    },
  });

  if (authErr || !authData.user?.id) {
    if (
      authErr?.message?.toLowerCase().includes("already") ||
      authErr?.message?.toLowerCase().includes("registered")
    ) {
      return { error: "رقم الهاتف أو البريد مسجّل مسبقاً" };
    }
    return { error: authErr?.message ?? "فشل إنشاء حساب المريض" };
  }

  const userId = authData.user.id;
  const { error: upsertErr } = await supabaseAdmin.from("User").upsert({
    id: userId,
    email,
    name,
    phone: canonicalPhone,
    role: "PATIENT",
  });

  if (upsertErr) {
    console.error(upsertErr);
    return { error: "فشل حفظ بيانات المريض" };
  }

  return { id: userId, created: true };
}
