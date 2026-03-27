-- تشغيل يدوي على PostgreSQL/Supabase بعد تحديث Prisma:
-- إضافة قيم Role ثم إنشاء جدول MedicalCenterPatientDocument (أو استخدم prisma migrate)

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MEDICAL_CENTER_RECEPTIONIST';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MEDICAL_CENTER_LAB_STAFF';

-- إن لم يدعم IF NOT EXISTS، نفّذ مرة واحدة:
-- ALTER TYPE "Role" ADD VALUE 'MEDICAL_CENTER_RECEPTIONIST';
-- ALTER TYPE "Role" ADD VALUE 'MEDICAL_CENTER_LAB_STAFF';

CREATE TABLE IF NOT EXISTS "MedicalCenterPatientDocument" (
  "id" TEXT NOT NULL,
  "medicalCenterId" TEXT NOT NULL,
  "patientUserId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileName" TEXT,
  "mimeType" TEXT,
  "uploadedByUserId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicalCenterPatientDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MedicalCenterPatientDocument_medicalCenterId_patientUserId_idx"
  ON "MedicalCenterPatientDocument"("medicalCenterId", "patientUserId");

ALTER TABLE "MedicalCenterPatientDocument" DROP CONSTRAINT IF EXISTS "MedicalCenterPatientDocument_medicalCenterId_fkey";
ALTER TABLE "MedicalCenterPatientDocument" ADD CONSTRAINT "MedicalCenterPatientDocument_medicalCenterId_fkey"
  FOREIGN KEY ("medicalCenterId") REFERENCES "MedicalCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MedicalCenterPatientDocument" DROP CONSTRAINT IF EXISTS "MedicalCenterPatientDocument_patientUserId_fkey";
ALTER TABLE "MedicalCenterPatientDocument" ADD CONSTRAINT "MedicalCenterPatientDocument_patientUserId_fkey"
  FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MedicalCenterPatientDocument" DROP CONSTRAINT IF EXISTS "MedicalCenterPatientDocument_uploadedByUserId_fkey";
ALTER TABLE "MedicalCenterPatientDocument" ADD CONSTRAINT "MedicalCenterPatientDocument_uploadedByUserId_fkey"
  FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- حقول إضافية لملف الموظف (راتب/دوام/تعليم/نوع)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "staffType" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "educationLevel" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "salaryMonthly" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "attendanceNotes" TEXT;
