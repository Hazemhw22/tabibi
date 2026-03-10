-- =============================================================================
-- RLS: تفعيل سياسات أمان الصفوف لجميع الجداول الحساسة
-- نفّذ هذا الملف في Supabase → SQL Editor (بترتيب الأقسام)
-- ملاحظة: استخدم auth.uid()::text لأن User.id و Doctor.userId من نوع TEXT (cuid)
-- =============================================================================

-- دالة مساعدة: معرف الطبيب للمستخدم الحالي (للاستخدام في السياسات)
CREATE OR REPLACE FUNCTION current_doctor_id()
RETURNS TEXT AS $$
  SELECT "id" FROM "Doctor" WHERE "userId" = auth.uid()::text LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- دالة: هل المستخدم الحالي أدمن منصة؟
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM "User" WHERE "id" = auth.uid()::text AND "role" = 'PLATFORM_ADMIN'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =============================================================================
-- 1) User — المستخدم يرى ويعدّل سجله فقط
-- =============================================================================
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_own_row" ON "User";
CREATE POLICY "user_own_row" ON "User"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("id" = auth.uid()::text)
  WITH CHECK ("id" = auth.uid()::text);

-- =============================================================================
-- 2) Account — مرتبط بـ User
-- =============================================================================
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "account_own_user" ON "Account";
CREATE POLICY "account_own_user" ON "Account"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- =============================================================================
-- 3) Session — مرتبط بـ User
-- =============================================================================
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_own_user" ON "Session";
CREATE POLICY "session_own_user" ON "Session"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- =============================================================================
-- 4) Doctor — الطبيب يرى ويعدّل سجله فقط؛ الأدمن يرى الكل (اختياري)
-- =============================================================================
ALTER TABLE "Doctor" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doctor_own_row" ON "Doctor";
CREATE POLICY "doctor_own_row" ON "Doctor"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

DROP POLICY IF EXISTS "doctor_admin_all" ON "Doctor";
CREATE POLICY "doctor_admin_all" ON "Doctor"
  AS PERMISSIVE FOR ALL TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- =============================================================================
-- 5) Clinic — الطبيب يرى/يعدّل عياداته فقط
-- =============================================================================
ALTER TABLE "Clinic" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinic_doctor_own" ON "Clinic";
CREATE POLICY "clinic_doctor_own" ON "Clinic"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("doctorId" = current_doctor_id())
  WITH CHECK ("doctorId" = current_doctor_id());

-- =============================================================================
-- 6) TimeSlot — الطبيب يرى/يعدّل مواعيده فقط
-- =============================================================================
ALTER TABLE "TimeSlot" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "timeslot_doctor_own" ON "TimeSlot";
CREATE POLICY "timeslot_doctor_own" ON "TimeSlot"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("doctorId" = current_doctor_id())
  WITH CHECK ("doctorId" = current_doctor_id());

-- =============================================================================
-- 7) Appointment — المريض: مواعيده؛ الطبيب: مواعيده
-- =============================================================================
ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointment_patient_own" ON "Appointment";
CREATE POLICY "appointment_patient_own" ON "Appointment"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("patientId" = auth.uid()::text)
  WITH CHECK ("patientId" = auth.uid()::text);

DROP POLICY IF EXISTS "appointment_doctor_own" ON "Appointment";
CREATE POLICY "appointment_doctor_own" ON "Appointment"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("doctorId" = current_doctor_id())
  WITH CHECK ("doctorId" = current_doctor_id());

-- =============================================================================
-- 8) Payment — مرتبط بموعد: المريض أو الطبيب صاحب الموعد
-- =============================================================================
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_via_appointment" ON "Payment";
CREATE POLICY "payment_via_appointment" ON "Payment"
  AS PERMISSIVE FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Appointment" a
      WHERE a."id" = "Payment"."appointmentId"
        AND (a."patientId" = auth.uid()::text OR a."doctorId" = current_doctor_id())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Appointment" a
      WHERE a."id" = "Payment"."appointmentId"
        AND (a."patientId" = auth.uid()::text OR a."doctorId" = current_doctor_id())
    )
  );

-- =============================================================================
-- 9) Review — المريض: تقييماته؛ الطبيب: التقييمات عليه
-- =============================================================================
ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "review_patient_own" ON "Review";
CREATE POLICY "review_patient_own" ON "Review"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("patientId" = auth.uid()::text)
  WITH CHECK ("patientId" = auth.uid()::text);

DROP POLICY IF EXISTS "review_doctor_own" ON "Review";
CREATE POLICY "review_doctor_own" ON "Review"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("doctorId" = current_doctor_id())
  WITH CHECK ("doctorId" = current_doctor_id());

-- =============================================================================
-- 10) Notification — المستخدم إشعاراته فقط
-- =============================================================================
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_own_user" ON "Notification";
CREATE POLICY "notification_own_user" ON "Notification"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- =============================================================================
-- 11) ClinicPatient — الطبيب: مرضى عيادته فقط (مع دعم doctorId = userId قديماً)
-- =============================================================================
ALTER TABLE "ClinicPatient" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doctor_manage_own_clinic_patients" ON "ClinicPatient";
CREATE POLICY "doctor_manage_own_clinic_patients" ON "ClinicPatient"
  AS PERMISSIVE FOR ALL TO authenticated
  USING (
    "doctorId" = current_doctor_id()
    OR "doctorId" = auth.uid()::text
  )
  WITH CHECK (
    "doctorId" = current_doctor_id()
    OR "doctorId" = auth.uid()::text
  );

-- المريض يرى سجلات ClinicPatient المرتبطة بحسابه (userId)
DROP POLICY IF EXISTS "clinic_patient_patient_own" ON "ClinicPatient";
CREATE POLICY "clinic_patient_patient_own" ON "ClinicPatient"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ("userId" = auth.uid()::text);

-- =============================================================================
-- 12) ClinicTransaction — عبر ClinicPatient: الطبيب فقط لمرضاه
-- =============================================================================
ALTER TABLE "ClinicTransaction" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinic_tx_via_patient" ON "ClinicTransaction";
CREATE POLICY "clinic_tx_via_patient" ON "ClinicTransaction"
  AS PERMISSIVE FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "ClinicPatient" cp
      WHERE cp."id" = "ClinicTransaction"."clinicPatientId"
        AND (cp."doctorId" = current_doctor_id() OR cp."doctorId" = auth.uid()::text)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "ClinicPatient" cp
      WHERE cp."id" = "ClinicTransaction"."clinicPatientId"
        AND (cp."doctorId" = current_doctor_id() OR cp."doctorId" = auth.uid()::text)
    )
  );

-- =============================================================================
-- 13) ClinicAppointment — الطبيب: مواعيد عيادته فقط
-- =============================================================================
ALTER TABLE "ClinicAppointment" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinic_apt_doctor_own" ON "ClinicAppointment";
CREATE POLICY "clinic_apt_doctor_own" ON "ClinicAppointment"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("doctorId" = current_doctor_id() OR "doctorId" = auth.uid()::text)
  WITH CHECK ("doctorId" = current_doctor_id() OR "doctorId" = auth.uid()::text);

-- =============================================================================
-- 14) ClinicMedicalNote — الطبيب: ملاحظاته فقط (مرضى عيادته)
-- =============================================================================
ALTER TABLE "ClinicMedicalNote" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "medical_note_doctor_own" ON "ClinicMedicalNote";
CREATE POLICY "medical_note_doctor_own" ON "ClinicMedicalNote"
  AS PERMISSIVE FOR ALL TO authenticated
  USING ("doctorId" = current_doctor_id() OR "doctorId" = auth.uid()::text)
  WITH CHECK ("doctorId" = current_doctor_id() OR "doctorId" = auth.uid()::text);

-- =============================================================================
-- 15) Specialty — قراءة عامة (للجميع)؛ الإدراج/التعديل للأدمن فقط إن أردت
-- =============================================================================
ALTER TABLE "Specialty" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "specialty_read_all" ON "Specialty";
CREATE POLICY "specialty_read_all" ON "Specialty"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "specialty_admin_write" ON "Specialty";
CREATE POLICY "specialty_admin_write" ON "Specialty"
  AS PERMISSIVE FOR ALL TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- =============================================================================
-- VerificationToken — عادة للاستخدام من السيرفر فقط؛ يمكن ترك RLS مع سياسة لا تسمح لأحد
-- أو عدم تفعيل RLS إن لم يُستدعَ من عميل أبداً
-- =============================================================================
-- ALTER TABLE "VerificationToken" ENABLE ROW LEVEL SECURITY;
-- سياسة فارغة = لا وصول عبر authenticated (يُدار عبر service role فقط)
