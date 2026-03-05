import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { z } from "zod";

const reviewSchema = z.object({
  appointmentId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await req.json();
    const data = reviewSchema.parse(body);

    // 1) الحصول على الموعد من Supabase
    const { data: appointment, error: aptErr } = await supabaseAdmin
      .from("Appointment")
      .select("id, patientId, doctorId, status")
      .eq("id", data.appointmentId)
      .single();

    if (aptErr || !appointment) {
      return NextResponse.json({ error: "الموعد غير موجود" }, { status: 404 });
    }

    if (appointment.patientId !== session.user.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    if (appointment.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "يمكن تقييم المواعيد المنجزة فقط" },
        { status: 400 }
      );
    }

    // 2) التحقق من عدم وجود تقييم سابق لنفس الموعد
    const { data: existingReview, error: existingErr } = await supabaseAdmin
      .from("Review")
      .select("id")
      .eq("appointmentId", data.appointmentId)
      .maybeSingle();

    if (existingErr) {
      console.error("Existing review check error:", existingErr);
    }

    if (existingReview) {
      return NextResponse.json({ error: "تم التقييم مسبقاً" }, { status: 409 });
    }

    // 3) إنشاء التقييم
    const { data: review, error: createErr } = await supabaseAdmin
      .from("Review")
      .insert({
        patientId: session.user.id,
        doctorId: appointment.doctorId,
        appointmentId: data.appointmentId,
        rating: data.rating,
        comment: data.comment ?? null,
      })
      .select("*")
      .single();

    if (createErr || !review) {
      console.error("Create review error:", createErr);
      return NextResponse.json({ error: "فشل إنشاء التقييم" }, { status: 500 });
    }

    // 4) تحديث تقييم الطبيب (المتوسط وإجمالي عدد التقييمات)
    const { data: allReviews, error: reviewsErr } = await supabaseAdmin
      .from("Review")
      .select("rating")
      .eq("doctorId", appointment.doctorId);

    if (!reviewsErr && allReviews && allReviews.length > 0) {
      const avgRating =
        allReviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) /
        allReviews.length;

      const { error: updateDoctorErr } = await supabaseAdmin
        .from("Doctor")
        .update({
          rating: avgRating,
          totalReviews: allReviews.length,
        })
        .eq("id", appointment.doctorId);

      if (updateDoctorErr) {
        console.error("Update doctor rating error:", updateDoctorErr);
      }
    }

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    console.error("Review error:", error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
