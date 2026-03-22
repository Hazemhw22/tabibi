import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createNotification } from "@/lib/notifications";
import { MEDICAL_CENTER_ANNUAL_FEE_NIS } from "@/lib/subscription-pricing";
import { z } from "zod";

const patchSchema = z.object({
  approvalStatus: z.enum(["APPROVED", "REJECTED"]),
});

/** موافقة أو رفض مركز طبي + تفعيل اشتراك سنوي للمركز والأطباء المرتبطين */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { approvalStatus } = patchSchema.parse(body);

    const { data: center, error: findErr } = await supabaseAdmin
      .from("MedicalCenter")
      .select("id, name, nameAr")
      .eq("id", id)
      .maybeSingle();

    if (findErr || !center) {
      return NextResponse.json({ error: "المركز غير موجود" }, { status: 404 });
    }

    if (approvalStatus === "APPROVED") {
      const end = new Date();
      end.setFullYear(end.getFullYear() + 1);

      const { error: upErr } = await supabaseAdmin
        .from("MedicalCenter")
        .update({
          approvalStatus: "APPROVED",
          isActive: true,
          subscriptionEndDate: end.toISOString(),
        })
        .eq("id", id);

      if (upErr) {
        console.error(upErr);
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }

      await supabaseAdmin
        .from("Doctor")
        .update({
          subscriptionPeriod: "yearly",
          subscriptionEndDate: end.toISOString(),
        })
        .eq("medicalCenterId", id);

      const { data: staff } = await supabaseAdmin
        .from("User")
        .select("id")
        .eq("medicalCenterId", id)
        .eq("role", "MEDICAL_CENTER_ADMIN");

      for (const u of staff ?? []) {
        await createNotification({
          userId: (u as { id: string }).id,
          title: "تم قبول طلب المركز الطبي",
          message: `تم تفعيل اشتراككم السنوي مع المنصة (${MEDICAL_CENTER_ANNUAL_FEE_NIS} ₪ لمدة سنة). يمكنكم الآن إدارة المركز والأطباء.`,
          type: "info",
          link: "/dashboard/medical-center",
        });
      }

      const { data: doctors } = await supabaseAdmin.from("Doctor").select("userId").eq("medicalCenterId", id);
      for (const d of doctors ?? []) {
        const uid = (d as { userId?: string }).userId;
        if (uid) {
          await createNotification({
            userId: uid,
            title: "تم تفعيل اشتراكك السنوي",
            message: `أنت مرتبط بمركز: ${(center as { nameAr?: string; name?: string }).nameAr ?? (center as { name?: string }).name}. تم تسجيل اشتراك سنوي مع المنصة ضمن باقة المركز.`,
            type: "info",
            link: "/dashboard/doctor",
          });
        }
      }

      return NextResponse.json({ ok: true, approvalStatus: "APPROVED", subscriptionEndDate: end.toISOString() });
    }

    const { error: rejErr } = await supabaseAdmin
      .from("MedicalCenter")
      .update({
        approvalStatus: "REJECTED",
        isActive: false,
      })
      .eq("id", id);

    if (rejErr) {
      return NextResponse.json({ error: rejErr.message }, { status: 500 });
    }

    const { data: staff } = await supabaseAdmin
      .from("User")
      .select("id")
      .eq("medicalCenterId", id)
      .eq("role", "MEDICAL_CENTER_ADMIN");

    for (const u of staff ?? []) {
      await createNotification({
        userId: (u as { id: string }).id,
        title: "بخصوص طلب تسجيل المركز",
        message: "تم رفض طلب تسجيل المركز. للاستفسار تواصل مع إدارة المنصة.",
        type: "info",
        link: "/contact",
      });
    }

    return NextResponse.json({ ok: true, approvalStatus: "REJECTED" });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
