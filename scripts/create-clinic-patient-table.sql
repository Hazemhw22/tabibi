-- ============================================================
-- إنشاء جدول مرضى العيادة (ClinicPatient) في Supabase
-- ============================================================
-- شغّل في: Supabase Dashboard > SQL Editor
-- مطلوب لزر "إضافة مريض جديد" عند الطبيب
-- ============================================================

CREATE TABLE IF NOT EXISTS public."ClinicPatient" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "doctorId" TEXT NOT NULL REFERENCES public."Doctor"(id) ON DELETE CASCADE,
  "userId" TEXT REFERENCES public."User"(id),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  "dateOfBirth" TIMESTAMPTZ,
  gender TEXT,
  address TEXT,
  "bloodType" TEXT,
  allergies TEXT,
  notes TEXT,
  "fileNumber" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_patient_doctor ON public."ClinicPatient"("doctorId");
CREATE INDEX IF NOT EXISTS idx_clinic_patient_active ON public."ClinicPatient"("isActive");

-- تفعيل RLS وسماح الطبيب بالوصول (اختياري)
ALTER TABLE public."ClinicPatient" ENABLE ROW LEVEL SECURITY;
