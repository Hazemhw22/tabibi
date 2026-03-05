-- معاملات مرضى المنصة (دفعات وخدمات يضيفها الطبيب لمريض حجز عبر المنصة)
-- شغّل في: Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS public."PlatformPatientTransaction" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "doctorId" TEXT NOT NULL REFERENCES public."Doctor"(id) ON DELETE CASCADE,
  "patientId" TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('PAYMENT', 'SERVICE')),
  description TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_tx_doctor ON public."PlatformPatientTransaction"("doctorId");
CREATE INDEX IF NOT EXISTS idx_platform_tx_patient ON public."PlatformPatientTransaction"("patientId");
ALTER TABLE public."PlatformPatientTransaction" ENABLE ROW LEVEL SECURITY;
