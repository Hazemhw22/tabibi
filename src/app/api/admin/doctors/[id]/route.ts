import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { EXTRA_CLINIC_ANNUAL_FEE_NIS } from "@/lib/subscription-pricing";

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
    const { status, subscriptionPeriod, canAddExtraClinics } = body as {
      status?: string;
      subscriptionPeriod?: keyof typeof SUBSCRIPTION_PLANS;
      canAddExtraClinics?: boolean;
    };

    const { data: beforeRow } = await supabaseAdmin
      .from("Doctor")
      .select("canAddExtraClinics, userId, medicalCenterId")
      .eq("id", id)
      .maybeSingle();
    const beforeExtra = Boolean((beforeRow as { canAddExtraClinics?: boolean } | null)?.canAddExtraClinics);

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
        const { data: existing } = await supabaseAdmin
          .from("Doctor")
          .select("subscriptionEndDate")
          .eq("id", id)
          .maybeSingle();
        const base = existing?.subscriptionEndDate ? new Date(existing.subscriptionEndDate) : new Date();
        if (base < new Date()) base.setTime(Date.now());
        base.setMonth(base.getMonth() + plan.months);
        updates.subscriptionPeriod = subscriptionPeriod;
        updates.subscriptionEndDate = base.toISOString();
      }
    }

    if (typeof canAddExtraClinics === "boolean") {
      if (canAddExtraClinics) {
        const mid = (beforeRow as { medicalCenterId?: string | null })?.medicalCenterId;
        if (!mid) {
          return NextResponse.json(
            { error: "السماح بعيادات إضافية يخص أطباء المركز الطبي فقط." },
            { status: 400 }
          );
        }
      }
      updates.canAddExtraClinics = canAddExtraClinics;
    }

    /** أطباء المركز: اشتراكهم يتبع اشتراك المركز (سنوي) — لا خطط 80/400/800 */
    const centerId = (beforeRow as { medicalCenterId?: string | null })?.medicalCenterId ?? null;
    if (updates.status === "APPROVED" && centerId && !subscriptionPeriod) {
      const { data: center } = await supabaseAdmin
        .from("MedicalCenter")
        .select("subscriptionEndDate")
        .eq("id", centerId)
        .maybeSingle();
      const end = (center as { subscriptionEndDate?: string | null } | null)?.subscriptionEndDate;
      if (end) {
        updates.subscriptionPeriod = "yearly";
        updates.subscriptionEndDate = end;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "لا يوجد تحديث صالح. اختر حالة/اشتراك أو السماح بعيادات إضافية." },
        { status: 400 }
      );
    }

    const { data: doctor, error } = await supabaseAdmin
      .from("Doctor")
      .update(updates)
      .eq("id", id)
      .select("id, userId, status, subscriptionPeriod, subscriptionEndDate, canAddExtraClinics, medicalCenterId")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!doctor) {
      return NextResponse.json({ error: "لم يُعثر على الطبيب أو لم يُحدَّث أي صف" }, { status: 404 });
    }

    const uid = doctor?.userId as string | undefined;
    const newlyEnabledExtra =
      typeof canAddExtraClinics === "boolean" &&
      canAddExtraClinics === true &&
      !beforeExtra &&
      Boolean((doctor as { medicalCenterId?: string | null })?.medicalCenterId);

    if (newlyEnabledExtra && uid) {
      const { error: payError } = await supabaseAdmin.from("SubscriptionPayment").insert({
        doctorId: id,
        amount: EXTRA_CLINIC_ANNUAL_FEE_NIS,
        period: "extra_clinic_yearly",
      });
      if (payError) console.error("SubscriptionPayment extra clinic:", payError);

      await supabaseAdmin.from("Notification").insert({
        userId: uid,
        title: "تم تفعيل إضافة عيادات",
        message: `يمكنك الآن إضافة عيادة إضافية من لوحة العيادات. الاشتراك الإضافي: ${EXTRA_CLINIC_ANNUAL_FEE_NIS} ₪ سنوياً.`,
        type: "info",
        link: "/dashboard/doctor/clinics",
      });
    }

    const wasCenterDoctor = Boolean(centerId);

    if (
      status === "APPROVED" &&
      uid &&
      subscriptionPeriod &&
      subscriptionPeriod in SUBSCRIPTION_PLANS &&
      !wasCenterDoctor
    ) {
      const plan = SUBSCRIPTION_PLANS[subscriptionPeriod];
      const { error: payError } = await supabaseAdmin.from("SubscriptionPayment").insert({
        doctorId: id,
        amount: plan.amount,
        period: subscriptionPeriod,
      });
      if (payError) console.error("SubscriptionPayment insert:", payError);

      await supabaseAdmin.from("Notification").insert({
        userId: uid,
        title: "تم قبول حسابك!",
        message: `مبروك! تم قبول حسابك كطبيب على منصة طبيبي. اشتراكك: ${plan.label} (₪${plan.amount}). يمكنك الآن استقبال المرضى.`,
        type: "doctor_approved",
        link: "/dashboard/doctor",
      });
    } else if (status === "REJECTED" && uid) {
      await supabaseAdmin.from("Notification").insert({
        userId: uid,
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
