-- جدول محاولات تسجيل الدخول (لمكافحة هجمات brute force)
-- نفّذ في Supabase SQL Editor

CREATE TABLE IF NOT EXISTS "LoginAttempt" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "ip"         TEXT NOT NULL,
  "attemptedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "LoginAttempt_ip_attemptedAt_idx"
  ON "LoginAttempt" ("ip", "attemptedAt" DESC);

COMMENT ON TABLE "LoginAttempt" IS 'سجل محاولات تسجيل الدخول حسب IP لتطبيق rate limiting';
