import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/doctors/[id]/booked-slots?date=YYYY-MM-DD
 * يرجع الأدوار المحجوزة (timeSlotId و startTime) لطبيب في تاريخ محدد.
 * المواعيد بحالة DRAFT أو CONFIRMED تُعتبر محجوزة.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: doctorId } = await params;
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    if (!dateStr) {
      return NextResponse.json({ error: "يجب تحديد التاريخ" }, { status: 400 });
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "تاريخ غير صالح" }, { status: 400 });
    }
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    const { data: appointments, error } = await supabaseAdmin
      .from("Appointment")
      .select("timeSlotId, startTime")
      .eq("doctorId", doctorId)
      .gte("appointmentDate", startOfDay.toISOString())
      .lt("appointmentDate", endOfDay.toISOString())
      .in("status", ["DRAFT", "CONFIRMED"]);

    if (error) {
      console.error("Booked slots fetch error:", error);
      return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
    }

    const bookedTimeSlotIds = [...new Set(
      (appointments ?? [])
        .map((a) => a.timeSlotId)
        .filter((id): id is string => !!id)
    )];
    const bookedStartTimes = [...new Set(
      (appointments ?? []).map((a) => a.startTime)
    )];

    return NextResponse.json({
      bookedTimeSlotIds,
      bookedStartTimes,
    });
  } catch (err) {
    console.error("Booked slots error:", err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
