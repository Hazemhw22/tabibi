import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const BUCKET = "avatars";

/** تأكد من وجود الـ bucket وأنه عام */
async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    await supabaseAdmin.storage.createBucket(BUCKET, {
      public: true,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      fileSizeLimit: 5 * 1024 * 1024, // 5 MB
    });
  }
}

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

    // التحقق من نوع الملف
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "يجب اختيار ملف صورة فقط" }, { status: 400 });
    }

    // تنظيم المجلدات: doctors / patients / admins
    const role = (session.user as { role?: string }).role ?? "patient";
    const folder =
      role === "DOCTOR" ? "doctors" : role === "ADMIN" ? "admins" : "patients";

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${folder}/${session.user.id}/avatar.${ext}`;

    // إنشاء الـ bucket إن لم يكن موجوداً
    await ensureBucket();

    const buf = await file.arrayBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buf, {
        contentType: file.type,
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(path);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err) {
    console.error("Upload avatar error:", err);
    return NextResponse.json({ error: "فشل رفع الصورة" }, { status: 500 });
  }
}
