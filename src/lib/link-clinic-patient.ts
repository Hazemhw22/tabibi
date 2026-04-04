import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * يربط سجلات ClinicPatient بحساب المستخدم (User) بناءً على رقم الهاتف.
 * يُستخدم عند تسجيل دخول المريض لأول مرة أو التحقق من هاتفه لضمان رؤية معاملاته ومواعيده.
 */
export async function linkClinicPatientToUser(userId: string, phone: string) {
  if (!userId || !phone) return;

  // تنظيف الرقم للمضاهاة (إزالة غير الأرقام)
  const cleanPhone = phone.replace(/\D/g, "");
  if (!cleanPhone) return;

  // احتمالات الرقم (بصفر، بدون صفر، بـ 972)
  const last9 = cleanPhone.slice(-9);
  const variations = [
    phone,
    cleanPhone,
    `+${cleanPhone}`,
    last9,
    `0${last9}`,
    `972${last9}`,
    `+972${last9}`,
  ];

  try {
    // 1. ابحث عن أي سجلات ClinicPatient تطابق هذا الهاتف ولم تُربط بعد
    const { data: clinicPatients, error: lookupError } = await supabaseAdmin
      .from("ClinicPatient")
      .select("id, userId")
      .in("whatsapp", variations)
      .is("userId", null);

    if (lookupError) {
      console.error("[link] lookup failed:", lookupError);
      return;
    }

    if (!clinicPatients || clinicPatients.length === 0) {
      console.log("[link] no clinic patients found for phone:", phone);
      return;
    }

    // 2. تحديث السجلات لترتبط بـ userId الخاص بالمستخدم الحالي
    const idsToUpdate = clinicPatients.map(p => p.id);
    const { error: updateError } = await supabaseAdmin
      .from("ClinicPatient")
      .update({ userId: userId })
      .in("id", idsToUpdate);

    if (updateError) {
      console.error("[link] update failed:", updateError);
    } else {
      console.log(`[link] successfully linked ${idsToUpdate.length} clinic patients to user ${userId}`);
    }
  } catch (error) {
    console.error("[link] unexpected error:", error);
  }
}
