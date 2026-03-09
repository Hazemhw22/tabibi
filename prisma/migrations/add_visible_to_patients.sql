-- إضافة عمود الظهور للمرضى لجدول Doctor
-- نفّذ هذا في Supabase SQL Editor

-- إذا كان اسم الجدول "Doctor" (بحرف كبير):
ALTER TABLE "Doctor"
ADD COLUMN IF NOT EXISTS "visibleToPatients" BOOLEAN DEFAULT true;

UPDATE "Doctor"
SET "visibleToPatients" = true
WHERE "visibleToPatients" IS NULL;

-- إذا لم يعمل، جرّب مع الجدول بأحرف صغيرة "doctor":
-- ALTER TABLE doctor
-- ADD COLUMN IF NOT EXISTS "visibleToPatients" BOOLEAN DEFAULT true;
