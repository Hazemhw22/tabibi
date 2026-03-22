import { supabaseAdmin } from "@/lib/supabase-admin";

/** عدد الحجوزات النشطة لنفس الطبيب ونفس اليوم ونفس timeSlotId */
export async function countAppointmentsForSlotOnDay(
  doctorId: string,
  appointmentDateIso: string,
  timeSlotId: string
): Promise<number> {
  const startOfDay = new Date(appointmentDateIso);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

  const { count, error } = await supabaseAdmin
    .from("Appointment")
    .select("id", { count: "exact", head: true })
    .eq("doctorId", doctorId)
    .eq("timeSlotId", timeSlotId)
    .gte("appointmentDate", startOfDay.toISOString())
    .lt("appointmentDate", endOfDay.toISOString())
    .in("status", ["DRAFT", "CONFIRMED"]);

  if (error) {
    console.error(error);
    return 999;
  }
  return count ?? 0;
}

export async function getTimeSlotCapacity(timeSlotId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("TimeSlot")
    .select("slotCapacity")
    .eq("id", timeSlotId)
    .maybeSingle();

  if (error || !data) return 1;
  const cap = (data as { slotCapacity?: number }).slotCapacity;
  return typeof cap === "number" && cap >= 1 ? cap : 1;
}

/** صفوف الحجز لنفس الفترة واليوم (لحساب الأدوار المحجوزة) — مرتبة زمنياً */
export async function getAppointmentRowsForSlotOnDay(
  doctorId: string,
  appointmentDateIso: string,
  timeSlotId: string
): Promise<{ slotTurn: number | null }[]> {
  const startOfDay = new Date(appointmentDateIso);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

  const { data, error } = await supabaseAdmin
    .from("Appointment")
    .select("slotTurn, createdAt")
    .eq("doctorId", doctorId)
    .eq("timeSlotId", timeSlotId)
    .gte("appointmentDate", startOfDay.toISOString())
    .lt("appointmentDate", endOfDay.toISOString())
    .in("status", ["DRAFT", "CONFIRMED"])
    .order("createdAt", { ascending: true });

  if (error || !data?.length) return [];
  return data.map((r) => ({ slotTurn: (r.slotTurn as number | null) ?? null }));
}
