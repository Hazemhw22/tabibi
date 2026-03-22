-- خطة علاجية حسب تخصص الطبيب
CREATE TABLE IF NOT EXISTS "ClinicPatientCarePlan" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "clinicPatientId" TEXT NOT NULL,
    "planType" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "doctorNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicPatientCarePlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClinicPatientCarePlan_clinicPatientId_key" ON "ClinicPatientCarePlan"("clinicPatientId");

ALTER TABLE "ClinicPatientCarePlan" DROP CONSTRAINT IF EXISTS "ClinicPatientCarePlan_doctorId_fkey";
ALTER TABLE "ClinicPatientCarePlan" ADD CONSTRAINT "ClinicPatientCarePlan_doctorId_fkey"
  FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClinicPatientCarePlan" DROP CONSTRAINT IF EXISTS "ClinicPatientCarePlan_clinicPatientId_fkey";
ALTER TABLE "ClinicPatientCarePlan" ADD CONSTRAINT "ClinicPatientCarePlan_clinicPatientId_fkey"
  FOREIGN KEY ("clinicPatientId") REFERENCES "ClinicPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
