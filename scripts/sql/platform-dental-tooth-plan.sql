-- مخطط أسنان لمريض المنصة (User) لدى طبيب — موازٍ لـ DentalToothPlan + clinicPatientId
-- نفّذه مرة واحدة في Supabase SQL Editor إن لم يكن الجدول موجوداً.

CREATE TABLE IF NOT EXISTS "PlatformDentalToothPlan" (
  "id" TEXT NOT NULL DEFAULT (gen_random_uuid()::text),
  "doctorId" TEXT NOT NULL,
  "patientUserId" TEXT NOT NULL,
  "toothNumber" INTEGER NOT NULL,
  "problemType" TEXT NOT NULL,
  "note" TEXT,
  "isDone" BOOLEAN NOT NULL DEFAULT false,
  "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "chargedToBalance" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "PlatformDentalToothPlan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlatformDentalToothPlan_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlatformDentalToothPlan_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlatformDentalToothPlan_doctor_patient_tooth_key" UNIQUE ("doctorId", "patientUserId", "toothNumber")
);

CREATE INDEX IF NOT EXISTS "PlatformDentalToothPlan_doctor_patient_idx"
  ON "PlatformDentalToothPlan" ("doctorId", "patientUserId");
