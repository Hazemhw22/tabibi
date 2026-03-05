-- تشغيل في Supabase SQL Editor للتحقق من تطابق الـ IDs
-- استبدل 'PATIENT_ID_HERE' بـ: 990ddc47-3a03-4a9a-b895-8df9e8befb03

SELECT
  cp.id            AS "ClinicPatient.id",
  cp."doctorId"    AS "ClinicPatient.doctorId",
  d.id             AS "Doctor.id",
  d."userId"       AS "Doctor.userId",
  u.email          AS "DoctorUser.email"
FROM public."ClinicPatient" cp
JOIN public."Doctor" d ON d.id = cp."doctorId"
JOIN public."User" u ON u.id = d."userId"
WHERE cp.id = '990ddc47-3a03-4a9a-b895-8df9e8befb03';
