-- ============================================================
-- السماح بتعديل عمود role (والجدول) في public."User" في Supabase
-- ============================================================
-- السبب: عند تفعيل Row Level Security (RLS) بدون سياسة UPDATE
-- لا يمكن تعديل الصفوف من واجهة Table Editor أو من الـ API.
--
-- شغّل هذا السكربت في: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 0) تفعيل RLS على الجدول (إن لم يكن مفعّلاً) — السياسات لا تعمل بدونه
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;

-- 1) التأكد من وجود سياسة SELECT (لقراءة الجدول في المحرر)
DROP POLICY IF EXISTS "Allow read User for authenticated" ON public."User";
CREATE POLICY "Allow read User for authenticated"
  ON public."User"
  FOR SELECT
  TO authenticated
  USING (true);

-- 2) السماح بتحديث أي عمود بما فيه role (للمحرر والـ API)
DROP POLICY IF EXISTS "Allow update User for authenticated" ON public."User";
CREATE POLICY "Allow update User for authenticated"
  ON public."User"
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3) إن كان المحرر يستخدم anon أحياناً، أضف نفس السياسات لـ anon (اختياري)
-- DROP POLICY IF EXISTS "Allow read User for anon" ON public."User";
-- CREATE POLICY "Allow read User for anon" ON public."User" FOR SELECT TO anon USING (true);
-- DROP POLICY IF EXISTS "Allow update User for anon" ON public."User";
-- CREATE POLICY "Allow update User for anon" ON public."User" FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 4) منح صلاحية UPDATE على الجدول (لأي دور يستخدمه المشروع)
GRANT UPDATE ON public."User" TO authenticated;
GRANT SELECT ON public."User" TO authenticated;

-- بعد التشغيل: جرّب تعديل عمود role من Table Editor أو من التطبيق.
-- القيم المسموحة لـ role حسب الـ enum: PATIENT, DOCTOR, CLINIC_ADMIN, PLATFORM_ADMIN
