-- ============================================================
-- إضافة عمود isDone لجدول DentalToothPlan
-- شغّل في: Supabase Dashboard > SQL Editor
-- ============================================================

ALTER TABLE public."DentalToothPlan"
ADD COLUMN IF NOT EXISTS "isDone" BOOLEAN NOT NULL DEFAULT false;
