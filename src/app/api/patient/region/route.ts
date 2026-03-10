import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { z } from "zod";

const bodySchema = z.object({ regionId: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "PATIENT") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const body = await req.json();
    const { regionId } = bodySchema.parse(body);

    const { error } = await supabaseAdmin
      .from("User")
      .update({ regionId, updatedAt: new Date().toISOString() })
      .eq("id", session.user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, regionId });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "regionId مطلوب" }, { status: 400 });
    }
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
