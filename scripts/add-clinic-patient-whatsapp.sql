-- ============================================================
-- إضافة عمود واتساب لجدول مرضى العيادة
-- شغّل في Supabase SQL Editor
-- ============================================================

ALTER TABLE public."ClinicPatient"
ADD COLUMN IF NOT EXISTS "whatsapp" TEXT;

COMMENT ON COLUMN public."ClinicPatient"."whatsapp" IS 'رقم الواتساب لإرسال رسائل الدفعات والديون';
