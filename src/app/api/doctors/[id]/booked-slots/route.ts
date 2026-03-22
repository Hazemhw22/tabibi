import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { buildOccupiedTurnsOrdered } from "@/lib/appointment-slot-turn";

/**
 * GET /api/doctors/[id]/booked-slots?date=YYYY-MM-DD
 * bookedCounts: عدد الحجوزات لكل timeSlotId
 * occupiedTurnsBySlot: الأدوار المحجوزة فعلياً لكل timeSlotId (1..slotCapacity)
 * fullyBookedTimeSlotIds: أدوار وصلت للحد الأقصى (slotCapacity)
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
      .select("timeSlotId, startTime, slotTurn, createdAt")
      .eq("doctorId", doctorId)
      .gte("appointmentDate", startOfDay.toISOString())
      .lt("appointmentDate", endOfDay.toISOString())
      .in("status", ["DRAFT", "CONFIRMED"])
      .order("createdAt", { ascending: true });

    if (error) {
      console.error("Booked slots fetch error:", error);
      return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
    }

    const bookedCounts: Record<string, number> = {};
    const startTimeCounts: Record<string, number> = {};
    const bySlot: Record<string, { slotTurn: number | null }[]> = {};

    for (const a of appointments ?? []) {
      const tid = a.timeSlotId as string | null;
      const st = a.startTime as string;
      if (tid) {
        bookedCounts[tid] = (bookedCounts[tid] ?? 0) + 1;
        if (!bySlot[tid]) bySlot[tid] = [];
        bySlot[tid].push({ slotTurn: (a.slotTurn as number | null) ?? null });
      }
      startTimeCounts[st] = (startTimeCounts[st] ?? 0) + 1;
    }

    const { data: slotRows } = await supabaseAdmin
      .from("TimeSlot")
      .select("id, slotCapacity")
      .eq("doctorId", doctorId);

    const occupiedTurnsBySlot: Record<string, number[]> = {};
    for (const [tid, rows] of Object.entries(bySlot)) {
      const row = slotRows?.find((x) => x.id === tid);
      const cap = (row as { slotCapacity?: number } | undefined)?.slotCapacity ?? 1;
      const used = buildOccupiedTurnsOrdered(rows, cap);
      occupiedTurnsBySlot[tid] = Array.from(used).sort((a, b) => a - b);
    }

    const fullyBookedTimeSlotIds: string[] = [];
    for (const [tid, count] of Object.entries(bookedCounts)) {
      const row = slotRows?.find((x) => x.id === tid);
      const cap = (row as { slotCapacity?: number } | undefined)?.slotCapacity ?? 1;
      if (count >= cap) fullyBookedTimeSlotIds.push(tid);
    }

    const bookedStartTimes = Object.keys(startTimeCounts).filter((st) => {
      const c = startTimeCounts[st] ?? 0;
      return c >= 1;
    });

    return NextResponse.json({
      bookedCounts,
      occupiedTurnsBySlot,
      fullyBookedTimeSlotIds,
      bookedTimeSlotIds: fullyBookedTimeSlotIds,
      bookedStartTimes,
    });
  } catch (err) {
    console.error("Booked slots error:", err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
