-- ============================================================
-- إنشاء جدول الإشعارات (Notification) في Supabase
-- ============================================================
-- شغّل في: Supabase Dashboard > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public."Notification" (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"    TEXT        NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  type        TEXT        NOT NULL DEFAULT 'info',
  "isRead"    BOOLEAN     NOT NULL DEFAULT false,
  link        TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- فهرس لتسريع استعلامات الإشعارات بالمستخدم
CREATE INDEX IF NOT EXISTS "Notification_userId_idx"
  ON public."Notification"("userId");

-- فهرس للإشعارات غير المقروءة
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx"
  ON public."Notification"("userId", "isRead");

-- صلاحيات الوصول
ALTER TABLE public."Notification" ENABLE ROW LEVEL SECURITY;

-- السماح للـ service_role بكل العمليات (يُستخدم من API)
CREATE POLICY "service_role_all_notifications"
  ON public."Notification"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
