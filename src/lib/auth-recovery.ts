import { supabaseAdmin } from "@/lib/supabase-admin";

/** عنوان التطبيق العام لروابط استعادة كلمة المرور (يجب إضافته في Supabase → Auth → URL configuration) */
export function getPublicAppUrl(): string {
  const a = process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  if (a) return a;
  const b = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (b) return b;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/**
 * يولّد رابط Supabase لاستعادة/تعيين كلمة المرور (يفتح صفحة التطبيق ثم يحدّث الجلسة).
 */
export async function generatePasswordRecoveryLink(authEmail: string): Promise<string | null> {
  const redirectTo = `${getPublicAppUrl()}/auth/update-password`;
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email: authEmail.trim(),
    options: { redirectTo },
  });
  if (error) {
    console.error("[auth-recovery] generateLink:", error.message);
    return null;
  }
  const link = data?.properties?.action_link;
  return typeof link === "string" && link.length > 0 ? link : null;
}
