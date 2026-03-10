-- إضافة عمود موقع العيادة (الضفة الغربية) لجدول Clinic
-- نفّذ هذا في Supabase SQL Editor

ALTER TABLE "Clinic"
ADD COLUMN IF NOT EXISTS "locationId" TEXT;

COMMENT ON COLUMN "Clinic"."locationId" IS 'معرف الموقع من قائمة مدن وقرى الضفة الغربية (مدينة / قرية للعمل)';

