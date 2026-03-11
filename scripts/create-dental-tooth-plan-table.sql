-- ============================================================
-- إنشاء جدول خطة علاج الأسنان (DentalToothPlan) في Supabase
-- ============================================================
-- شغّل في: Supabase Dashboard > SQL Editor
-- مطلوب لـ API حفظ مخطط الأسنان عند أطباء الأسنان
-- ============================================================

CREATE TABLE IF NOT EXISTS public."DentalToothPlan" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "clinicPatientId" TEXT NOT NULL,
  "toothNumber" INT NOT NULL CHECK ("toothNumber" >= 1 AND "toothNumber" <= 32),
  "problemType" TEXT NOT NULL,
  "note" TEXT,
  "isDone" BOOLEAN NOT NULL DEFAULT false,
  "price" NUMERIC(10,2) DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."DentalToothPlan"
  ADD CONSTRAINT "DentalToothPlan_clinicPatientId_fkey"
  FOREIGN KEY ("clinicPatientId") REFERENCES public."ClinicPatient"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_dental_tooth_plan_patient
  ON public."DentalToothPlan"("clinicPatientId");

COMMENT ON TABLE public."DentalToothPlan" IS 'خطة علاج الأسنان للمريض (رقم السن، نوع المشكلة، ملاحظة، منجز)';
