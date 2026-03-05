-- ============================================================
-- إضافة أدمن وتصحيح الـ Trigger — نفّذ بالترتيب
-- ============================================================

-- الخطوة 1: إزالة الـ Trigger (نفّذ هذا فقط أولاً)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============================================================
-- الخطوة 2: من لوحة Supabase
--   Authentication > Users > Add user
--   Email: hazemhaw221@gmail.com
--   Password: Ha456456@@
--   ثم احفظ
-- ============================================================

-- الخطوة 3: بعد إنشاء المستخدم، نفّذ الأوامر التالية كلها معاً
-- (تضيف سجل في User + تحدّث metadata الأدمن + تعيد الـ Trigger)

-- إدراج/تحديث في جدول User من auth.users حسب البريد
INSERT INTO public."User" (id, email, name, role, "createdAt", "updatedAt")
SELECT id, email, 'hazem', 'PLATFORM_ADMIN', now(), now()
FROM auth.users
WHERE email = 'hazemhaw221@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  "updatedAt" = now();

-- جعل بيانات الجلسة تحتوي على دور الأدمن عند تسجيل الدخول
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"name":"hazem","role":"PLATFORM_ADMIN"}'::jsonb
WHERE email = 'hazemhaw221@gmail.com';

-- إعادة الـ Trigger للمستخدمين الجدد
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public."User" (id, email, name, phone, role, "createdAt", "updatedAt")
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::text, 'PATIENT')::"Role",
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
