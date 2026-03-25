import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isNotificationSchemaMissingError } from "@/lib/notification-table-error";

export async function POST() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!session || !userId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const { error } = await supabaseAdmin
      .from("Notification")
      .update({ isRead: true })
      .eq("userId", userId)
      .eq("isRead", false);

    if (error && isNotificationSchemaMissingError(error)) {
      return NextResponse.json({ success: true, skipped: true });
    }
    if (error) {
      console.error("[notifications/read-all]", error.message, error.code);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[notifications/read-all]", e);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
