import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("Notification")
      .select("id, title, message, type, isRead, link, createdAt")
      .eq("userId", session.user.id)
      .order("createdAt", { ascending: false })
      .limit(30);

    if (error) {
      console.error("[Notifications API] Supabase error:", error.message, error.code);
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    const unreadCount = (data ?? []).filter((n) => !n.isRead).length;
    return NextResponse.json({ notifications: data ?? [], unreadCount });
  } catch {
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
