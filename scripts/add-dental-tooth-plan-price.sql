-- ============================================================
-- إضافة عمود price لجدول DentalToothPlan
-- شغّل في: Supabase Dashboard > SQL Editor
-- ============================================================

ALTER TABLE public."DentalToothPlan"
ADD COLUMN IF NOT EXISTS "price" NUMERIC(10,2) DEFAULT 0;
