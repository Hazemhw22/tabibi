import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    await supabaseAdmin
      .from("Notification")
      .update({ isRead: true })
      .eq("userId", session.user.id)
      .eq("isRead", false);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
