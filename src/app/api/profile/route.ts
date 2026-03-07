import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل").max(100),
  phone: z.string().max(30).optional(),
});

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await req.json();
    const data = updateProfileSchema.parse(body);

    const userId = session.user.id as string;
    const role = (session.user as { role?: string }).role;
    const nameToSave = data.name.trim();
    const phoneToSave = data.phone != null ? String(data.phone).trim() : "";

    // 1) تحديث user_metadata في Auth (دمج مع الموجود)
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const existingMeta = (authUser?.user?.user_metadata as Record<string, unknown>) || {};
    const newMeta = {
      ...existingMeta,
      name: nameToSave,
      phone: phoneToSave,
      role: role ?? existingMeta.role ?? "PATIENT",
    };

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: newMeta,
    });

    if (authError) {
      console.error("Profile update auth error:", authError);
      return NextResponse.json({ error: "فشل تحديث بيانات الحساب: " + authError.message }, { status: 500 });
    }

    // 2) تحديث جدول User
    const { error: dbError } = await supabaseAdmin
      .from("User")
      .update({ name: nameToSave, phone: phoneToSave })
      .eq("id", userId);

    if (dbError) {
      console.error("Profile update db error:", dbError);
      return NextResponse.json({ error: "فشل تحديث البيانات: " + dbError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "تم حفظ التعديلات",
      name: nameToSave,
      phone: phoneToSave,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "بيانات غير صالحة" },
        { status: 400 }
      );
    }
    console.error("Profile update error:", err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
