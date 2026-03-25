import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isNotificationSchemaMissingError } from "@/lib/notification-table-error";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!session || !userId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("Notification")
      .select("id, title, message, type, isRead, link, createdAt")
      .eq("userId", userId)
      .order("createdAt", { ascending: false })
      .limit(30);

    if (error) {
      if (isNotificationSchemaMissingError(error)) {
        console.warn(
          "[Notifications API] جدول الإشعارات غير متاح — أعد قائمة فارغة (أنشئ جدول Notification في Supabase أو طبّق prisma db push)"
        );
        return NextResponse.json({ notifications: [], unreadCount: 0 });
      }
      console.error("[Notifications API] Supabase error:", error.message, error.code, error.details);
      return NextResponse.json(
        { error: error.message || "خطأ قاعدة البيانات", code: error.code },
        { status: 500 }
      );
    }

    const unreadCount = (data ?? []).filter((n) => !n.isRead).length;
    return NextResponse.json({ notifications: data ?? [], unreadCount });
  } catch (e) {
    console.error("[Notifications API] Unexpected:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "حدث خطأ" },
      { status: 500 }
    );
  }
}
