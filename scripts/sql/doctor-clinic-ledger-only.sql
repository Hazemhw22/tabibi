-- =============================================================================
-- جدول مصروفات العيادة — DoctorClinicLedger
-- إن كان الجدول موجوداً: نفّذ فقط السطر الأخير (قسم ب) + حدّث التطبيق (يولّد id).
-- =============================================================================

-- (أ) enum + جدول + فهارس وقيود (مرة واحدة؛ تجاهل أخطاء "already exists")
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DoctorClinicLedgerKind') THEN
    CREATE TYPE "DoctorClinicLedgerKind" AS ENUM ('CLINIC_PURCHASE', 'SALARY_PAYMENT');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "DoctorClinicLedger" (
  "id" TEXT NOT NULL DEFAULT (gen_random_uuid()::text),
  "doctorId" TEXT NOT NULL,
  "kind" "DoctorClinicLedgerKind" NOT NULL,
  "title" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  "staffUserId" TEXT,
  CONSTRAINT "DoctorClinicLedger_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DoctorClinicLedger_doctorId_fkey') THEN
    ALTER TABLE "DoctorClinicLedger"
      ADD CONSTRAINT "DoctorClinicLedger_doctorId_fkey"
      FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DoctorClinicLedger_staffUserId_fkey') THEN
    ALTER TABLE "DoctorClinicLedger"
      ADD CONSTRAINT "DoctorClinicLedger_staffUserId_fkey"
      FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "DoctorClinicLedger_doctorId_occurredAt_idx"
  ON "DoctorClinicLedger" ("doctorId", "occurredAt");

-- (ب) إصلاح Postgres 23502: عمود id بدون قيمة — توليد تلقائي (آمن إعادة تنفيذه)
ALTER TABLE "DoctorClinicLedger"
  ALTER COLUMN "id" SET DEFAULT (gen_random_uuid()::text);
