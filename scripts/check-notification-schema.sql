-- ============================================================
-- التحقق من بنية جدول الإشعارات
-- شغّل في: Supabase Dashboard > SQL Editor
-- ============================================================
-- إذا كانت الأعمدة تظهر كـ user_id, is_read, created_at (snake_case)
-- فستحتاج لتحديث سكربت create-notifications-table.sql
-- ============================================================

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'Notification'
ORDER BY ordinal_position;
