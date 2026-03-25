-- جدول الإشعارات (إن وُجد في Prisma ولم يُطبَّق على Supabase)
CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT PRIMARY KEY NOT NULL DEFAULT (gen_random_uuid()::text),
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "link" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification" ("userId");
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx" ON "Notification" ("userId", "isRead");
