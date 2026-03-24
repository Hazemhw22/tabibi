import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

function bearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!h?.startsWith("Bearer ")) return null;
  const t = h.slice(7).trim();
  return t.length > 0 ? t : null;
}

/** جلسة الويب (NextAuth) أو تطبيق الهاتف (JWT من Supabase في Authorization) */
async function resolveUserId(req: Request): Promise<string | null> {
  const token = bearerToken(req);
  if (token) {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && data.user?.id) return data.user.id;
  }
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET(req: Request) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { data: user } = await supabaseAdmin
      .from("User")
      .select("id, name, image, phone, gender")
      .eq("id", userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      image: (user as { image?: string | null }).image ?? null,
      phone: (user as { phone?: string | null }).phone ?? null,
      gender: (user as { gender?: string | null }).gender ?? null,
    });
  } catch {
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
