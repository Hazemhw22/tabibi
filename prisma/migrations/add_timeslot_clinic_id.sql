-- ربط أوقات العمل بكل عيادة (اختياري)
-- نفّذ هذا في Supabase SQL Editor

ALTER TABLE "TimeSlot"
ADD COLUMN IF NOT EXISTS "clinicId" TEXT;

ALTER TABLE "TimeSlot"
ADD CONSTRAINT "TimeSlot_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL;

COMMENT ON COLUMN "TimeSlot"."clinicId" IS 'العيادة المرتبطة بهذا الوقت (لكل عيادة جدول خاص)';

