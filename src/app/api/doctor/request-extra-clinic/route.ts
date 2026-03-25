import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { doctorMayAddExtraClinicsWhileLinkedToCenter } from "@/lib/doctor-extra-clinics";
import { notifyPlatformAdmins } from "@/lib/notifications";
import { EXTRA_CLINIC_ANNUAL_FEE_NIS } from "@/lib/subscription-pricing";

/** طبيب مرتبط بمركز يطلب السماح بإضافة عيادة إضافية (يتطلب موافقة مشرف + 500 ₪ سنوياً) */
export async function POST() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { data: doctor, error } = await supabaseAdmin
      .from("Doctor")
      .select(
        "id, medicalCenterId, userId, canAddExtraClinics, subscriptionPeriod, subscriptionEndDate, subscriptionPlan, user:User(name)"
      )
      .eq("userId", session.user.id)
      .maybeSingle();

    if (error || !doctor) {
      return NextResponse.json({ error: "الطبيب غير موجود" }, { status: 404 });
    }

    const mid = (doctor as { medicalCenterId?: string | null }).medicalCenterId;
    if (!mid) {
      return NextResponse.json({ error: "هذا الطلب لأطباء المركز الطبي فقط" }, { status: 400 });
    }
    if (doctorMayAddExtraClinicsWhileLinkedToCenter(doctor as Parameters<typeof doctorMayAddExtraClinicsWhileLinkedToCenter>[0])) {
      return NextResponse.json({
        message:
          "يمكنك إضافة عيادات من صفحة «العيادات والمواعيد» دون طلب — لديك اشتراك منفصل في المنصة أو تم تفعيل الخيار من الإدارة.",
      });
    }

    const name =
      (doctor as { user?: { name?: string } }).user?.name ?? session.user.name ?? "طبيب";

    await notifyPlatformAdmins(
      "طلب إضافة عيادة إضافية",
      `الدكتور ${name} (مرتبط بمركز طبي) يطلب السماح بإضافة عيادة جديدة. الرسوم الإضافية: ${EXTRA_CLINIC_ANNUAL_FEE_NIS} ₪ سنوياً. راجع صفحة الطبيب في الإدارة وفعّل «السماح بعيادات إضافية».`,
      `/dashboard/admin/doctors/${(doctor as { id: string }).id}`
    );

    return NextResponse.json({
      message: "تم إرسال طلبك لإدارة المنصة. سيتم التواصل معك أو تفعيل الخيار من لوحة الإدارة.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
