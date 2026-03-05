/**
 * إنشاء حساب أدمن في Supabase (Auth + جدول User)
 * التشغيل: node scripts/create-admin.js
 * تأكد من وجود .env.local مع NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY
 */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN = {
  name: "hazem",
  email: "hazemhaw221@gmail.com",
  password: "Ha456456@@",
  role: "PLATFORM_ADMIN",
};

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("❌ تأكد من وجود NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في .env.local");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("جاري إنشاء حساب الأدمن في Supabase Auth...");

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: ADMIN.email,
    password: ADMIN.password,
    email_confirm: true,
    user_metadata: { name: ADMIN.name, role: ADMIN.role },
  });

  if (authError) {
    if (authError.message.includes("already been registered") || authError.message.includes("already exists")) {
      console.log("⚠️ البريد مسجل مسبقاً. جاري تحديث جدول User فقط...");
      const { data: list } = await supabase.auth.admin.listUsers({ perPage: 100 });
      const user = list?.users?.find((u) => u.email === ADMIN.email);
      if (!user) {
        console.error("❌ لم يتم العثور على المستخدم في Auth. أنشئ المستخدم من لوحة Supabase Auth أولاً.");
        process.exit(1);
      }
      await ensureUserRow(supabase, user.id, ADMIN.email, ADMIN.name, ADMIN.role);
      console.log("✅ تم تحديث سجل الأدمن في جدول User. يمكنه تسجيل الدخول الآن.");
      return;
    }
    console.error("❌ خطأ Auth:", authError.message);
    process.exit(1);
  }

  const userId = authData.user?.id;
  if (!userId) {
    console.error("❌ لم يُرجع إنشاء المستخدم معرفاً");
    process.exit(1);
  }

  await ensureUserRow(supabase, userId, ADMIN.email, ADMIN.name, ADMIN.role);
  console.log("✅ تم إنشاء حساب الأدمن بنجاح.");
  console.log("   البريد:", ADMIN.email);
  console.log("   يمكنه تسجيل الدخول من /login");
}

async function ensureUserRow(supabase, userId, email, name, role) {
  const { error } = await supabase.from("User").upsert(
    {
      id: userId,
      email,
      name,
      role,
      updatedAt: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (error) {
    console.error("❌ خطأ جدول User:", error.message);
    process.exit(1);
  }
}

main();
