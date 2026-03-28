import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const WINDOW_MINUTES = 15;
const MAX_ATTEMPTS = 5;

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  if (forwarded) return forwarded.split(",")[0].trim();
  if (realIP) return realIP;
  return "unknown";
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isLoginAttempt =
    request.method === "POST" && pathname === "/api/auth/callback/credentials";

  if (!isLoginAttempt) return NextResponse.next();

  const ip = getClientIP(request);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.next();
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

  const { count, error: countError } = await supabase
    .from("LoginAttempt")
    .select("*", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("attemptedAt", windowStart);

  // عند تجاوز الحد: لا تعِد التوجيه إلى صفحة HTML (/login).
  // NextAuth يتوقع استجابة JSON من POST /api/auth/callback/credentials؛
  // إعادة التوجيه تعيد HTML فيتعطل clientside عند res.json() → SyntaxError: Unexpected token '<'.
  if ((count ?? 0) >= MAX_ATTEMPTS) {
    return NextResponse.next();
  }

  if (countError) {
    return NextResponse.next();
  }

  await supabase.from("LoginAttempt").insert({
    ip,
    attemptedAt: new Date().toISOString(),
  });

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/auth/callback/credentials"],
};
