import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// للاستخدام على جانب العميل (browser) وServer Components
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
