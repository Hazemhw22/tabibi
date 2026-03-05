import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { status, subscriptionPlan } = body as {
      status?: string;
      subscriptionPlan?: string;
    };

    const updates: { status?: string; subscriptionPlan?: string } = {};
    if (status && ["APPROVED", "REJECTED", "SUSPENDED"].includes(status)) {
      updates.status = status;
    }
    if (
      subscriptionPlan &&
      ["basic", "premium", "enterprise"].includes(subscriptionPlan)
    ) {
      updates.subscriptionPlan = subscriptionPlan;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "لا يوجد تحديث صالح" }, { status: 400 });
    }

    const { data: doctor, error } = await supabaseAdmin
      .from("Doctor")
      .update(updates)
      .eq("id", id)
      .select("id, userId, status, subscriptionPlan")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (status === "APPROVED" && doctor?.userId) {
      await supabaseAdmin.from("Notification").insert({
        userId: doctor.userId,
        title: "تم قبول حسابك!",
        message: "مبروك! تم قبول حسابك كطبيب على منصة طبيبي. يمكنك الآن استقبال المرضى.",
        type: "doctor_approved",
        link: "/dashboard/doctor",
      });
    } else if (status === "REJECTED" && doctor?.userId) {
      await supabaseAdmin.from("Notification").insert({
        userId: doctor.userId,
        title: "تم رفض طلبك",
        message: "للأسف، تم رفض طلب تسجيلك كطبيب. تواصل مع الدعم لمزيد من المعلومات.",
        type: "doctor_rejected",
      });
    }

    return NextResponse.json(doctor);
  } catch (error) {
    console.error("Admin doctor update error:", error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
