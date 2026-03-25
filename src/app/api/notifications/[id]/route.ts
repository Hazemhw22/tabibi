import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isNotificationSchemaMissingError } from "@/lib/notification-table-error";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!session || !userId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const { id } = await params;
    const { error } = await supabaseAdmin
      .from("Notification")
      .update({ isRead: true })
      .eq("id", id)
      .eq("userId", userId);

    if (error && isNotificationSchemaMissingError(error)) {
      return NextResponse.json({ success: true, skipped: true });
    }
    if (error) {
      console.error("[notifications/id]", error.message, error.code);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[notifications/id]", e);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
