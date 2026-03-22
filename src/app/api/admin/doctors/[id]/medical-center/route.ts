import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const bodySchema = z.object({
  medicalCenterId: z.string().nullable(),
});

/** ربط طبيب بمركز طبي أو إلغاء الربط — إدارة المنصة فقط */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { id: doctorId } = await params;
    const json = await req.json();
    const { medicalCenterId } = bodySchema.parse(json);

    if (medicalCenterId) {
      const { data: c } = await supabaseAdmin
        .from("MedicalCenter")
        .select("id")
        .eq("id", medicalCenterId)
        .maybeSingle();
      if (!c) {
        return NextResponse.json({ error: "المركز غير موجود" }, { status: 400 });
      }
    }

    const { error } = await supabaseAdmin
      .from("Doctor")
      .update({ medicalCenterId })
      .eq("id", doctorId);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "فشل التحديث" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
