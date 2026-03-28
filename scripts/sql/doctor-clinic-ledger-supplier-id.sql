-- =============================================================================
-- DoctorClinicLedger.supplierId — ربط مشتريات العيادة بمزوّد مسجّل (DoctorClinicSupplier)
-- نفّذ مرة واحدة على Postgres/Supabase بعد ترحيل Prisma إن لزم.
-- =============================================================================

ALTER TABLE "DoctorClinicLedger" ADD COLUMN IF NOT EXISTS "supplierId" TEXT;

CREATE INDEX IF NOT EXISTS "DoctorClinicLedger_supplierId_idx" ON "DoctorClinicLedger" ("supplierId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DoctorClinicLedger_supplierId_fkey') THEN
    ALTER TABLE "DoctorClinicLedger"
      ADD CONSTRAINT "DoctorClinicLedger_supplierId_fkey"
      FOREIGN KEY ("supplierId") REFERENCES "DoctorClinicSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;
