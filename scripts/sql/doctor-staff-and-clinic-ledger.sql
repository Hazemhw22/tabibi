-- =============================================================================
-- موظفو الطبيب (User) + مصروفات العيادة (DoctorClinicLedger)
-- متوافق مع prisma/schema.prisma — نفّذه على Postgres (Supabase SQL Editor أو psql)
-- =============================================================================
-- ملاحظات:
-- 1) نفّذ السطور بالترتيب. إن وُجد عنصر مسبقاً قد تظهر أخطاء — تجاهل أو علّق السطر.
-- 2) أسماء الجداول كما في Prisma: "User"، "Doctor"، "DoctorClinicLedger".
-- 3) إن فشل ALTER TYPE داخل سكربت مجمّع، نفّذ قسم (1) وحده أولاً ثم الباقي.
-- =============================================================================

-- ── 1) توسيع enum الدور Role بقيم موظفي عيادة الطبيب ─────────────────────────
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'DOCTOR_RECEPTION';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'DOCTOR_ASSISTANT';

-- ── 2) enum نوع سطر دفتر مصروفات العيادة ───────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DoctorClinicLedgerKind') THEN
    CREATE TYPE "DoctorClinicLedgerKind" AS ENUM ('CLINIC_PURCHASE', 'SALARY_PAYMENT');
  END IF;
END$$;

-- ── 3) أعمدة ربط موظف الطبيب بجدول User (قد تكون موجودة بعد prisma migrate) ─
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "employerDoctorId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "doctorStaffRole" TEXT;
-- salaryMonthly موجود أصلاً لموظفي المركز؛ نفس العمود يُستخدم كراتب مرجعي لموظف الطبيب

-- مفتاح أجنبي: الموظف يتبع طبيباً معيّناً
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_employerDoctorId_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_employerDoctorId_fkey"
      FOREIGN KEY ("employerDoctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "User_employerDoctorId_idx" ON "User" ("employerDoctorId");

-- ── 4) جدول مصروفات العيادة ودفعات الرواتب ───────────────────────────────────
CREATE TABLE IF NOT EXISTS "DoctorClinicLedger" (
  "id" TEXT NOT NULL DEFAULT (gen_random_uuid()::text),
  "doctorId" TEXT NOT NULL,
  "kind" "DoctorClinicLedgerKind" NOT NULL,
  "title" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  "staffUserId" TEXT,

  CONSTRAINT "DoctorClinicLedger_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DoctorClinicLedger_doctorId_fkey'
  ) THEN
    ALTER TABLE "DoctorClinicLedger"
      ADD CONSTRAINT "DoctorClinicLedger_doctorId_fkey"
      FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

-- اختياري: ربط staffUserId بمستخدم (موظف) عند دفعات راتب
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DoctorClinicLedger_staffUserId_fkey'
  ) THEN
    ALTER TABLE "DoctorClinicLedger"
      ADD CONSTRAINT "DoctorClinicLedger_staffUserId_fkey"
      FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "DoctorClinicLedger_doctorId_occurredAt_idx"
  ON "DoctorClinicLedger" ("doctorId", "occurredAt");

-- ── 5) إن وُجد الجدول مسبقاً بدون DEFAULT لعمود id (خطأ 23502 عند الإدراج بدون id) ─
ALTER TABLE "DoctorClinicLedger"
  ALTER COLUMN "id" SET DEFAULT (gen_random_uuid()::text);

-- =============================================================================
-- بعد التنفيذ: شغّل `npx prisma db pull` أو `npx prisma migrate` لمزامنة Prisma
-- إن كنت تستخدم migrations فقط، يفضّل `prisma migrate dev` بدل هذا الملف لتجنب الاختلاف.
-- =============================================================================
--
-- (6) PostgREST / Supabase API — علاقتان بين Doctor و User
--     بعد إضافة employerDoctorId → Doctor، لم يعد embed الافتراضي
--     user:User(...) من جدول Doctor واضحاً لـ PostgREST (خطأ أو نتائج فارغة).
--     الحل في التطبيق: استخدام اسم القيد صراحةً، مثال:
--       user:User!Doctor_userId_fkey(name, email)
--     راجع أيضاً: إعادة تحميل مخطط الـ API في Supabase إذا لزم.
-- =============================================================================
