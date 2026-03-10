-- إضافة منطقة المريض لجدول User
-- نفّذ في Supabase SQL Editor

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "regionId" TEXT;

COMMENT ON COLUMN "User"."regionId" IS 'منطقة المريض (معرف من قائمة الضفة الغربية)';
