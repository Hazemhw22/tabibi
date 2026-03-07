-- ============================================================
-- إصلاح: تمكين المريض من تعديل بياناته (الاسم ورقم الهاتف) من صفحة الإعدادات
-- ============================================================
-- السبب المحتمل: عمود phone غير موجود، أو سياسات RLS تمنع التحديث.
-- نفّذ هذا السكربت في: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1) التأكد من وجود عمود phone في جدول User
ALTER TABLE public."User"
ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN public."User".phone IS 'رقم الهاتف/الواتساب للمريض أو الطبيب';

-- 2) التأكد من وجود عمود name (عادةً موجود)
-- لو الجدول قديم جداً و name غير موجود:
-- ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS name TEXT;

-- 3) تفعيل RLS على الجدول (إن كان معطّلاً ستفعّله، وإن كان مفعّلاً لا يضر)
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;

-- 4) سياسة SELECT: المستخدم المسجّل يدخل يمكنه قراءة بياناته فقط (أو الكل حسب حاجتك)
DROP POLICY IF EXISTS "Allow read User for authenticated" ON public."User";
CREATE POLICY "Allow read User for authenticated"
  ON public."User"
  FOR SELECT
  TO authenticated
  USING (true);

-- 5) سياسة UPDATE: المستخدم يمكنه تحديث صفّه فقط (id = auth.uid())
--    هذا يخدم أي طلب يأتي بجلسة المستخدم (authenticated).
--    طلبات الـ API من الخادم تستخدم service_role فتتجاوز RLS ولا تحتاج سياسة.
DROP POLICY IF EXISTS "Allow update User for authenticated" ON public."User";
CREATE POLICY "Allow update User for authenticated"
  ON public."User"
  FOR UPDATE
  TO authenticated
  USING (id = (auth.uid())::text)
  WITH CHECK (id = (auth.uid())::text);

-- 6) (اختياري) السماح لـ service_role بكل العمليات.
--    الخادم (API) يستخدم مفتاح service_role الذي عادةً يتجاوز RLS تلقائياً.
--    إن ظهر خطأ "role service_role does not exist" فاحذف من DROP POLICY حتى نهاية CREATE POLICY فقط.
DROP POLICY IF EXISTS "Allow service_role full access User" ON public."User";
CREATE POLICY "Allow service_role full access User"
  ON public."User"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 7) منح صلاحيات GRANT
GRANT SELECT, UPDATE ON public."User" TO authenticated;
GRANT ALL ON public."User" TO service_role;

-- 8) (اختياري) التحقق: عرض الأعمدة الحالية لجدول User
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'User'
-- ORDER BY ordinal_position;
