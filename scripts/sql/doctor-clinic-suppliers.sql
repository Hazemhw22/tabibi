-- =============================================================================
-- مزوّدو مستلزمات العيادة — DoctorClinicSupplier
-- جهات اتصال يضيفها الطبيب (شركات / أشخاص يزودون المعدات والمستلزمات).
-- =============================================================================

CREATE TABLE IF NOT EXISTS "DoctorClinicSupplier" (
  "id" TEXT NOT NULL,
  "doctorId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "companyName" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DoctorClinicSupplier_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DoctorClinicSupplier_doctorId_idx" ON "DoctorClinicSupplier"("doctorId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DoctorClinicSupplier_doctorId_fkey') THEN
    ALTER TABLE "DoctorClinicSupplier"
      ADD CONSTRAINT "DoctorClinicSupplier_doctorId_fkey"
      FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;
