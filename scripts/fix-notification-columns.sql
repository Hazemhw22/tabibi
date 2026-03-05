-- ============================================================
-- إضافة الأعمدة الناقصة لجدول Notification
-- شغّل في: Supabase Dashboard > SQL Editor
-- ============================================================
-- الأعمدة userId و type مطلوبة لربط الإشعارات بالمستخدمين
-- ============================================================

-- إضافة userId إن لم يكن موجوداً (يربط الإشعار بالمستخدم)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Notification' AND column_name = 'userId'
  ) THEN
    ALTER TABLE public."Notification" ADD COLUMN "userId" TEXT REFERENCES public."User"(id) ON DELETE CASCADE;
  END IF;
END $$;

-- إضافة type إن لم تكن موجودة (تصنيف: payment, service, appointment, info)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Notification' AND column_name = 'type'
  ) THEN
    ALTER TABLE public."Notification" ADD COLUMN type TEXT NOT NULL DEFAULT 'info';
  END IF;
END $$;

-- إنشاء فهرس على userId إن لم يكن موجوداً
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON public."Notification"("userId");
