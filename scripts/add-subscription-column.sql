-- شغّل هذا في Supabase SQL Editor لإضافة عمود الاشتراك للأطباء
ALTER TABLE "Doctor"
ADD COLUMN IF NOT EXISTS "subscriptionPlan" TEXT DEFAULT 'basic';

COMMENT ON COLUMN "Doctor"."subscriptionPlan" IS 'basic | premium | enterprise';
