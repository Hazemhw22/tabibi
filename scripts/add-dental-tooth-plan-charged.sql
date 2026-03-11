-- ============================================================
-- إضافة عمود chargedToBalance لجدول DentalToothPlan
-- لتجنب إضافة السعر للرصيد أكثر من مرة للسن نفسه
-- شغّل في: Supabase Dashboard > SQL Editor
-- ============================================================

ALTER TABLE public."DentalToothPlan"
ADD COLUMN IF NOT EXISTS "chargedToBalance" BOOLEAN NOT NULL DEFAULT false;
