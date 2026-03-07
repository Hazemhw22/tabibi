-- ============================================================
-- إصلاح سياسة RLS لجدول ClinicPatient
-- الخطأ: new row violates row-level security policy for table "ClinicPatient"
-- شغّل في Supabase SQL Editor
-- ============================================================

-- السماح لـ service_role بجميع العمليات (الـ API يستخدمه)
DROP POLICY IF EXISTS "service_role_clinic_patients" ON public."ClinicPatient";
CREATE POLICY "service_role_clinic_patients"
  ON public."ClinicPatient"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- إن كان التطبيق يستخدم authenticated، أضف سياسة للطبيب فقط
-- (الطبيب يضيف مرضى لـ doctorId الخاص به)
-- DROP POLICY IF EXISTS "doctor_own_clinic_patients" ON public."ClinicPatient";
-- CREATE POLICY "doctor_own_clinic_patients"
--   ON public."ClinicPatient"
--   FOR ALL
--   TO authenticated
--   USING (
--     "doctorId" IN (
--       SELECT id FROM public."Doctor" WHERE "userId" = auth.uid()::text
--     )
--   )
--   WITH CHECK (
--     "doctorId" IN (
--       SELECT id FROM public."Doctor" WHERE "userId" = auth.uid()::text
--     )
--   );
