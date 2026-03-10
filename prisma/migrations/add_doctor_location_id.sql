-- إضافة عمود موقع الطبيب (الضفة الغربية) لجدول Doctor
-- نفّذ هذا في Supabase SQL Editor

ALTER TABLE "Doctor"
ADD COLUMN IF NOT EXISTS "locationId" TEXT;

COMMENT ON COLUMN "Doctor"."locationId" IS 'معرف الموقع من قائمة مدن وقرى الضفة الغربية';
