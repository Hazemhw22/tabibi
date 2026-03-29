-- تخصصات اختيارية: التغذية العلاجية، البشرة والليزر، والدمج
-- نفّذ مرة واحدة على قاعدة البيانات إن رغبت بظهورها جاهزة في قوائم التخصصات.
-- يمكن للطبيب أيضاً إضافة تخصص يدوياً من إعدادات الحساب.

INSERT INTO "Specialty" ("id", "name", "nameAr", "icon")
SELECT 'cm_spec_clinical_nutrition', 'clinical-nutrition', 'التغذية العلاجية', NULL
WHERE NOT EXISTS (SELECT 1 FROM "Specialty" WHERE "name" = 'clinical-nutrition');

INSERT INTO "Specialty" ("id", "name", "nameAr", "icon")
SELECT 'cm_spec_derm_laser', 'dermatology-laser', 'العناية بالبشرة والليزر', NULL
WHERE NOT EXISTS (SELECT 1 FROM "Specialty" WHERE "name" = 'dermatology-laser');

INSERT INTO "Specialty" ("id", "name", "nameAr", "icon")
SELECT 'cm_spec_nutrition_derm', 'nutrition-dermatology', 'التغذية العلاجية والعناية بالبشرة والليزر', NULL
WHERE NOT EXISTS (SELECT 1 FROM "Specialty" WHERE "name" = 'nutrition-dermatology');
