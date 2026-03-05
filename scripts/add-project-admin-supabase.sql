-- ============================================================
-- جعل hazemhaw221@gmail.com مسؤول المشروع (PLATFORM_ADMIN)
-- ============================================================
-- نفّذ هذا بعد إنشاء المستخدم من:
--   Supabase > Authentication > Users > Add user
--   Email: hazemhaw221@gmail.com  |  Password: 12345678
-- ثم شغّل هذا السكربت من: SQL Editor
-- ============================================================

-- إضافة/تحديث السجل في جدول User ودور مسؤول المنصة
INSERT INTO public."User" (id, email, name, role, "createdAt", "updatedAt")
SELECT id, email, COALESCE(raw_user_meta_data->>'name', 'hazem'), 'PLATFORM_ADMIN', now(), now()
FROM auth.users
WHERE email = 'hazemhaw221@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'PLATFORM_ADMIN',
  name = COALESCE(EXCLUDED.name, public."User".name),
  "updatedAt" = now();

-- حتى يظهر الاسم والدور في الجلسة عند تسجيل الدخول
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"name":"hazem","role":"PLATFORM_ADMIN"}'::jsonb
WHERE email = 'hazemhaw221@gmail.com';
