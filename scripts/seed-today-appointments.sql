-- ============================================================
-- مواعيد وهمية لليوم لكل طبيب معتمد
-- ============================================================
-- شغّل في: Supabase Dashboard > SQL Editor
-- يتطلب وجود مستخدم واحد على الأقل بدور PATIENT (مريض).
-- يضيف لكل طبيب معتمد 4 مواعيد لليوم الحالي: 09:00، 10:00، 11:00، 14:00
-- ============================================================

-- استخدام مريض واحد لجميع المواعيد (أول مستخدم بدور مريض، أو أي مستخدم إن لم يوجد)
WITH patient AS (
  SELECT id FROM "User" WHERE role = 'PATIENT' LIMIT 1
),
fallback_patient AS (
  SELECT id FROM "User" LIMIT 1
),
one_patient AS (
  SELECT COALESCE((SELECT id FROM patient), (SELECT id FROM fallback_patient)) AS id
),
doctors AS (
  SELECT id, "consultationFee" FROM "Doctor" WHERE status = 'APPROVED'
),
slots AS (
  SELECT * FROM (VALUES
    ('09:00', '09:30'),
    ('10:00', '10:30'),
    ('11:00', '11:30'),
    ('14:00', '14:30')
  ) AS t("startTime", "endTime")
),
inserted AS (
  INSERT INTO "Appointment" (
    id, "patientId", "doctorId", "appointmentDate", "startTime", "endTime",
    "status", "paymentStatus", "fee", "createdAt", "updatedAt"
  )
  SELECT
    gen_random_uuid()::text,
    op.id,
    d.id,
    CURRENT_DATE::timestamp,
    s."startTime",
    s."endTime",
    'CONFIRMED',
    'UNPAID',
    COALESCE(NULLIF(d."consultationFee", 0), 100),
    NOW(),
    NOW()
  FROM doctors d
  CROSS JOIN slots s
  CROSS JOIN one_patient op
  WHERE op.id IS NOT NULL
  RETURNING id, fee
)
INSERT INTO "Payment" (id, "appointmentId", amount, status, method, "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, i.id, i.fee, 'UNPAID', 'clinic', NOW(), NOW()
FROM inserted i;
