-- ============================================================
-- إضافة حساب أدمن في Supabase (خطوتان)
-- ============================================================
--
-- الخطوة 1 — من لوحة Supabase (يدوي):
--   Authentication > Users > Add user
--   Email:    hazemhaw221@gmail.com
--   Password: Ha456456@@
--   بعد الحفظ انسخ "User UID" (مثل: a1b2c3d4-e5f6-7890-abcd-ef1234567890)
--
-- الخطوة 2 — من SQL Editor:
--   استبدل في الأمر التالي <USER_UID> بالمعرف الذي نسخته، ثم شغّل الأمر.
--
-- ============================================================

INSERT INTO public."User" (id, email, name, role, "createdAt", "updatedAt")
VALUES (
  '<USER_UID>',
  'hazemhaw221@gmail.com',
  'hazem',
  'PLATFORM_ADMIN',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  "updatedAt" = now();
