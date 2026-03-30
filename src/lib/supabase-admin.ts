import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
}
if (!supabaseServiceKey) {
  throw new Error(
    "Missing env: SUPABASE_SERVICE_ROLE_KEY (server-only). Add it to your deployment environment (e.g. Vercel) to bypass RLS in admin API routes.",
  );
}

// للاستخدام على جانب الخادم فقط (API routes, Server Components)
// يتجاوز RLS — لا تستخدمه في Client Components
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    // تعطيل Next.js fetch cache لضمان الحصول على بيانات حديثة دائماً
    fetch: (url: RequestInfo | URL, options?: RequestInit) =>
      fetch(url, { ...options, cache: "no-store" }),
  },
});
