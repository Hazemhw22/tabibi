import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file?.size) {
      return NextResponse.json({ error: "لم يتم اختيار ملف" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${session.user.id}/avatar.${ext}`;

    const buf = await file.arrayBuffer();
    const { error } = await supabaseAdmin.storage
      .from("avatars")
      .upload(path, buf, { contentType: file.type, upsert: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from("avatars").getPublicUrl(path);
    return NextResponse.json({ url: urlData.publicUrl });
  } catch (e) {
    return NextResponse.json({ error: "فشل رفع الصورة" }, { status: 500 });
  }
}
