import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const SUBSCRIPTION_PLANS = {
  monthly: { amount: 80, months: 1, label: "شهري" },
  half_year: { amount: 400, months: 6, label: "نصف سنة" },
  yearly: { amount: 800, months: 12, label: "سنة" },
} as const;

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
    const { status, subscriptionPeriod } = body as {
      status?: string;
      subscriptionPeriod?: keyof typeof SUBSCRIPTION_PLANS;
    };

    const updates: Record<string, unknown> = {};
    if (status && ["APPROVED", "REJECTED", "SUSPENDED"].includes(status)) {
      updates.status = status;
    }

    if (subscriptionPeriod && subscriptionPeriod in SUBSCRIPTION_PLANS) {
      const plan = SUBSCRIPTION_PLANS[subscriptionPeriod];
      if (status === "APPROVED") {
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + plan.months);
        updates.subscriptionPeriod = subscriptionPeriod;
        updates.subscriptionEndDate = endDate.toISOString();
      } else {
        const { data: existing } = await supabaseAdmin.from("Doctor").select("subscriptionEndDate").eq("id", id).single();
        const base = existing?.subscriptionEndDate ? new Date(existing.subscriptionEndDate) : new Date();
        if (base < new Date()) base.setTime(Date.now());
        base.setMonth(base.getMonth() + plan.months);
        updates.subscriptionPeriod = subscriptionPeriod;
        updates.subscriptionEndDate = base.toISOString();
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "لا يوجد تحديث صالح. عند القبول يجب اختيار نوع الاشتراك." }, { status: 400 });
    }

    const { data: doctor, error } = await supabaseAdmin
      .from("Doctor")
      .update(updates)
      .eq("id", id)
      .select("id, userId, status, subscriptionPeriod, subscriptionEndDate")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (status === "APPROVED" && doctor?.userId && subscriptionPeriod && subscriptionPeriod in SUBSCRIPTION_PLANS) {
      const plan = SUBSCRIPTION_PLANS[subscriptionPeriod];
      const { error: payError } = await supabaseAdmin.from("SubscriptionPayment").insert({
        doctorId: id,
        amount: plan.amount,
        period: subscriptionPeriod,
      });
      if (payError) console.error("SubscriptionPayment insert:", payError);

      await supabaseAdmin.from("Notification").insert({
        userId: doctor.userId,
        title: "تم قبول حسابك!",
        message: `مبروك! تم قبول حسابك كطبيب على منصة طبيبي. اشتراكك: ${plan.label} (₪${plan.amount}). يمكنك الآن استقبال المرضى.`,
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
