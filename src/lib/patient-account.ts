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

/** أرقام فقط؛ يضمن طولاً ≥ 6 لمتطلبات Supabase Auth */
export function buildPhonePassword(phoneRaw: string): string {
  const digits = phoneRaw.replace(/\D/g, "");
  if (digits.length >= 6) return digits;
  return digits.padEnd(6, "0");
}

/** مقارنة رقمين (آخر 9 أرقام) لربط الطبيب بحساب موجود */
export function phonesMatchLast9(stored: string | null | undefined, input: string): boolean {
  const a = (stored ?? "").replace(/\D/g, "").slice(-9);
  const b = input.replace(/\D/g, "").slice(-9);
  return a.length === 9 && b.length === 9 && a === b;
}

function phoneMatchOrClause(phoneRaw: string): string | null {
  const digits = phoneRaw.replace(/\D/g, "");
  if (digits.length < 9) return null;
  const { canonicalPhone, normalizedPhone } = normalizePatientPhone(phoneRaw);
  const variants = [
    canonicalPhone,
    normalizedPhone,
    `972${normalizedPhone}`,
    `970${normalizedPhone}`,
  ];
  const unique = [...new Set(variants)];
  return unique.map((v) => `phone.eq.${v}`).join(",");
}

/** بحث عن مرضى (User بدور PATIENT) يطابقون الرقم — للطبيب عند الإضافة */
export async function findPatientUsersByPhone(phoneRaw: string): Promise<
  { id: string; name: string | null; email: string | null; phone: string | null }[]
> {
  const orClause = phoneMatchOrClause(phoneRaw);
  if (!orClause) return [];

  const { data, error } = await supabaseAdmin
    .from("User")
    .select("id, name, email, phone")
    .eq("role", "PATIENT")
    .or(orClause)
    .limit(20);

  if (error) {
    console.error("[findPatientUsersByPhone]", error);
    return [];
  }
  return data ?? [];
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

  const { data: existingRows } = await supabaseAdmin
    .from("User")
    .select("id, role")
    .or(`phone.eq.${canonicalPhone},phone.eq.${normalizedPhone},phone.eq.972${normalizedPhone},phone.eq.970${normalizedPhone}`)
    .limit(1);

  const existing = existingRows?.[0];

  if (existing?.id) {
    if (existing.role !== "PATIENT") {
      return { error: "رقم الهاتف مسجّل كحساب ليس مريضاً" };
    }
    await supabaseAdmin.from("User").update({ name }).eq("id", existing.id);
    return { id: existing.id, created: false };
  }

  const password = buildPhonePassword(phoneRaw);
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
