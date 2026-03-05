-- ============================================================
-- أطباء وهميون للعرض (بدون حسابات دخول في Auth)
-- ============================================================
-- شغّل في: Supabase Dashboard > SQL Editor
-- يضيف تخصصات + مستخدمين في public."User" + سجلات في public."Doctor"
--
-- ملاحظة: إذا كان عمود public."User".id من نوع uuid (مرتبط بـ auth.users)
-- فاستبدل قيم id بأي uuid، مثلاً: gen_random_uuid() أو uuid من لوحة Auth.
-- ============================================================

-- 1) تخصصات (تجاهل إن وُجد الاسم)
INSERT INTO public."Specialty" (name, "nameAr", icon)
SELECT 'Cardiology', 'أمراض القلب', '❤️' WHERE NOT EXISTS (SELECT 1 FROM public."Specialty" WHERE name = 'Cardiology');
INSERT INTO public."Specialty" (name, "nameAr", icon)
SELECT 'General', 'طب عام', '🩺' WHERE NOT EXISTS (SELECT 1 FROM public."Specialty" WHERE name = 'General');
INSERT INTO public."Specialty" (name, "nameAr", icon)
SELECT 'Pediatrics', 'أطفال', '👶' WHERE NOT EXISTS (SELECT 1 FROM public."Specialty" WHERE name = 'Pediatrics');

-- 2) مستخدمون وهميون (أدوار طبيب)
INSERT INTO public."User" (id, name, email, role, "createdAt", "updatedAt")
VALUES
  ('user-demo-doc-1', 'د. أحمد محمد', 'ahmed.doctor@demo.com', 'DOCTOR', now(), now()),
  ('user-demo-doc-2', 'د. سارة علي', 'sara.doctor@demo.com', 'DOCTOR', now(), now()),
  ('user-demo-doc-3', 'د. خالد حسن', 'khalid.doctor@demo.com', 'DOCTOR', now(), now()),
  ('user-demo-doc-4', 'د. نورة إبراهيم', 'nora.doctor@demo.com', 'DOCTOR', now(), now()),
  ('user-demo-doc-5', 'د. عمر يوسف', 'omar.doctor@demo.com', 'DOCTOR', now(), now())
ON CONFLICT (email) DO NOTHING;

-- 3) أطباء وهميون (مرتبطون بالمستخدمين أعلاه وأي تخصص موجود)
INSERT INTO public."Doctor" (id, "userId", "specialtyId", bio, "experienceYears", "consultationFee", "licenseNumber", status, rating, "totalReviews", "createdAt", "updatedAt")
SELECT 'doc-demo-1', 'user-demo-doc-1', (SELECT id FROM public."Specialty" LIMIT 1), 'طبيب وهمي للعرض — أمراض قلب.', 5, 150, 'LIC-DEMO-1', 'APPROVED', 4.5, 10, now(), now()
WHERE EXISTS (SELECT 1 FROM public."User" WHERE id = 'user-demo-doc-1') AND NOT EXISTS (SELECT 1 FROM public."Doctor" WHERE id = 'doc-demo-1');
INSERT INTO public."Doctor" (id, "userId", "specialtyId", bio, "experienceYears", "consultationFee", "licenseNumber", status, rating, "totalReviews", "createdAt", "updatedAt")
SELECT 'doc-demo-2', 'user-demo-doc-2', (SELECT id FROM public."Specialty" LIMIT 1 OFFSET 1), 'طبيب وهمي للعرض — طب عام.', 7, 200, 'LIC-DEMO-2', 'APPROVED', 4.8, 20, now(), now()
WHERE EXISTS (SELECT 1 FROM public."User" WHERE id = 'user-demo-doc-2') AND NOT EXISTS (SELECT 1 FROM public."Doctor" WHERE id = 'doc-demo-2');
INSERT INTO public."Doctor" (id, "userId", "specialtyId", bio, "experienceYears", "consultationFee", "licenseNumber", status, rating, "totalReviews", "createdAt", "updatedAt")
SELECT 'doc-demo-3', 'user-demo-doc-3', (SELECT id FROM public."Specialty" LIMIT 1 OFFSET 2), 'طبيب وهمي للعرض — أطفال.', 10, 180, 'LIC-DEMO-3', 'APPROVED', 4.2, 15, now(), now()
WHERE EXISTS (SELECT 1 FROM public."User" WHERE id = 'user-demo-doc-3') AND NOT EXISTS (SELECT 1 FROM public."Doctor" WHERE id = 'doc-demo-3');
INSERT INTO public."Doctor" (id, "userId", "specialtyId", bio, "experienceYears", "consultationFee", "licenseNumber", status, rating, "totalReviews", "createdAt", "updatedAt")
SELECT 'doc-demo-4', 'user-demo-doc-4', (SELECT id FROM public."Specialty" LIMIT 1), 'طبيب وهمي للعرض.', 4, 120, 'LIC-DEMO-4', 'APPROVED', 4.9, 8, now(), now()
WHERE EXISTS (SELECT 1 FROM public."User" WHERE id = 'user-demo-doc-4') AND NOT EXISTS (SELECT 1 FROM public."Doctor" WHERE id = 'doc-demo-4');
INSERT INTO public."Doctor" (id, "userId", "specialtyId", bio, "experienceYears", "consultationFee", "licenseNumber", status, rating, "totalReviews", "createdAt", "updatedAt")
SELECT 'doc-demo-5', 'user-demo-doc-5', (SELECT id FROM public."Specialty" LIMIT 1 OFFSET 1), 'طبيب وهمي للعرض.', 6, 160, 'LIC-DEMO-5', 'APPROVED', 4.6, 12, now(), now()
WHERE EXISTS (SELECT 1 FROM public."User" WHERE id = 'user-demo-doc-5') AND NOT EXISTS (SELECT 1 FROM public."Doctor" WHERE id = 'doc-demo-5');
