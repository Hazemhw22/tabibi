-- ============================================================
-- إضافة أعمدة الاشتراك والواتساب للأطباء + جدول مدفوعات الاشتراكات
-- شغّل في Supabase SQL Editor
-- ============================================================

-- أعمدة جديدة لجدول Doctor
ALTER TABLE public."Doctor"
ADD COLUMN IF NOT EXISTS "subscriptionPeriod" TEXT DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS "subscriptionEndDate" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "whatsapp" TEXT;

COMMENT ON COLUMN public."Doctor"."subscriptionPeriod" IS 'monthly | half_year | yearly';
COMMENT ON COLUMN public."Doctor"."subscriptionEndDate" IS 'تاريخ انتهاء الاشتراك';
COMMENT ON COLUMN public."Doctor"."whatsapp" IS 'رقم الواتساب للتواصل';

-- جدول مدفوعات الاشتراكات (إيرادات مسؤول النظام)
CREATE TABLE IF NOT EXISTS public."SubscriptionPayment" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "doctorId"  TEXT NOT NULL REFERENCES public."Doctor"(id) ON DELETE CASCADE,
  amount      FLOAT NOT NULL,
  period      TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "SubscriptionPayment_doctorId_idx" ON public."SubscriptionPayment"("doctorId");
CREATE INDEX IF NOT EXISTS "SubscriptionPayment_createdAt_idx" ON public."SubscriptionPayment"("createdAt");

ALTER TABLE public."SubscriptionPayment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_subscription_payments"
  ON public."SubscriptionPayment" FOR ALL TO service_role
  USING (true) WITH CHECK (true);
