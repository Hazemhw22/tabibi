-- إنشاء جدول ملاحظات / ملفات طبية متعددة لكل مريض عيادة
-- نفّذ هذا في Supabase SQL Editor

CREATE TABLE IF NOT EXISTS "ClinicMedicalNote" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "doctorId" TEXT NOT NULL,
  "clinicPatientId" TEXT NOT NULL,
  "allergies" TEXT,
  "diagnosis" TEXT,
  "treatment" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE "ClinicMedicalNote"
  ADD CONSTRAINT "ClinicMedicalNote_doctorId_fkey"
  FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE;

ALTER TABLE "ClinicMedicalNote"
  ADD CONSTRAINT "ClinicMedicalNote_clinicPatientId_fkey"
  FOREIGN KEY ("clinicPatientId") REFERENCES "ClinicPatient"("id") ON DELETE CASCADE;

COMMENT ON TABLE "ClinicMedicalNote" IS 'ملاحظات طبية متعددة لكل مريض عيادة (حساسية، حالة مرضية، علاج).';

