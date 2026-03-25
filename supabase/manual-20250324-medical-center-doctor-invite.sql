-- تشغيل يدوي على Supabase (SQL Editor) إن لم تستخدم prisma db push
-- 1) ربط العيادة بالمركز
ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "medicalCenterId" TEXT;
-- إن وُجدت مراجع FK مسبقاً اضبط حسب بيئتك:
-- ALTER TABLE "Clinic" ADD CONSTRAINT "Clinic_medicalCenterId_fkey"
--   FOREIGN KEY ("medicalCenterId") REFERENCES "MedicalCenter"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "Clinic_doctorId_medicalCenterId_idx" ON "Clinic" ("doctorId", "medicalCenterId");

-- 2) جدول دعوات المركز للطبيب
CREATE TABLE IF NOT EXISTS "MedicalCenterDoctorInvite" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "medicalCenterId" TEXT NOT NULL,
  "doctorId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "consultationFee" DOUBLE PRECISION NOT NULL,
  "doctorClinicFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "patientFeeServiceType" TEXT NOT NULL DEFAULT 'CONSULTATION',
  "proposedTimeSlotsJson" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "respondedAt" TIMESTAMPTZ,
  CONSTRAINT "MedicalCenterDoctorInvite_medicalCenterId_fkey"
    FOREIGN KEY ("medicalCenterId") REFERENCES "MedicalCenter"("id") ON DELETE CASCADE,
  CONSTRAINT "MedicalCenterDoctorInvite_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "MedicalCenterDoctorInvite_center_status_idx"
  ON "MedicalCenterDoctorInvite" ("medicalCenterId", "status");
CREATE INDEX IF NOT EXISTS "MedicalCenterDoctorInvite_doctor_status_idx"
  ON "MedicalCenterDoctorInvite" ("doctorId", "status");
