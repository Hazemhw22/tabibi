-- إنشاء سجل رسائل SMS داخل قاعدة PostgreSQL/Supabase
-- ملاحظة: إن كنت تستخدم prisma migrate/db push، قد لا تحتاج هذا الملف.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MessageStatus') THEN
    CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "MessageLog" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByUserId" TEXT NOT NULL,
  "createdByRole" "Role" NOT NULL,
  "medicalCenterId" TEXT,
  "doctorId" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'ASTRA',
  "channel" TEXT NOT NULL DEFAULT 'SMS',
  "to" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
  "providerResponse" TEXT,
  CONSTRAINT "MessageLog_pkey" PRIMARY KEY ("id")
);

-- إن كان الجدول موجود مسبقاً بدون default لـ id، هذا يضيف توليد UUID تلقائي
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
ALTER TABLE "MessageLog" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

CREATE INDEX IF NOT EXISTS "MessageLog_createdByUserId_createdAt_idx" ON "MessageLog" ("createdByUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "MessageLog_medicalCenterId_createdAt_idx" ON "MessageLog" ("medicalCenterId", "createdAt");
CREATE INDEX IF NOT EXISTS "MessageLog_doctorId_createdAt_idx" ON "MessageLog" ("doctorId", "createdAt");
CREATE INDEX IF NOT EXISTS "MessageLog_status_createdAt_idx" ON "MessageLog" ("status", "createdAt");

ALTER TABLE "MessageLog" DROP CONSTRAINT IF EXISTS "MessageLog_createdByUserId_fkey";
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MessageLog" DROP CONSTRAINT IF EXISTS "MessageLog_medicalCenterId_fkey";
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_medicalCenterId_fkey"
  FOREIGN KEY ("medicalCenterId") REFERENCES "MedicalCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MessageLog" DROP CONSTRAINT IF EXISTS "MessageLog_doctorId_fkey";
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_doctorId_fkey"
  FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

