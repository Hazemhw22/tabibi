import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verify } from "jsonwebtoken";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "fallback_secret_for_jwt";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    let userId;
    try {
      const decoded = verify(token, JWT_SECRET) as { id: string };
      userId = decoded.id;
    } catch (e: any) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("Notification")
      .select("id, title, message, type, isRead, link, createdAt")
      .eq("userId", userId)
      .order("createdAt", { ascending: false })
      .limit(30);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const unreadCount = (data ?? []).filter((n) => !n.isRead).length;
    return NextResponse.json({ notifications: data ?? [], unreadCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
