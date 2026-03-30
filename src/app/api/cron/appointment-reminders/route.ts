import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  buildAppointmentReminderSmsMessage,
  sendSmsAndWhatsAppToSameNumber,
  deliveryAnyChannelSucceeded,
} from "@/lib/sms";
import { formatDateNumeric } from "@/lib/utils";

/** تاريخ التقويم (يوم/شهر/سنة) بتوقيت القدس */
function ymdInJerusalem(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** غداً بتوقيت القدس (yyyy-mm-dd) — إضافة يوم تقويمي لتاريخ «اليوم» في القدس */
function tomorrowYmdJerusalem(): string {
  const today = ymdInJerusalem(new Date());
  const [y, m, d] = today.split("-").map(Number);
  const u = Date.UTC(y, m - 1, d + 1);
  return ymdInJerusalem(new Date(u));
}

/**
 * يوميًا: إرسال تذكير SMS للمرضى الذين موعدهم غداً (موافق عليه).
 * استدعاء: GET مع Authorization: Bearer CRON_SECRET
 * جدولة: Vercel Cron أو خادم خارجي مرة يوميًا.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET غير مضبوط" }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const targetYmd = tomorrowYmdJerusalem();

  const { data: rows, error } = await supabaseAdmin
    .from("Appointment")
    .select(
      `
      id,
      appointmentDate,
      startTime,
      patientId,
      appointmentReminderSentAt,
      patient:User(phone),
      doctor:Doctor(user:User!Doctor_userId_fkey(name)),
      clinic:Clinic(name)
    `,
    )
    .eq("status", "CONFIRMED")
    .is("appointmentReminderSentAt", null)
    .gte("appointmentDate", new Date().toISOString());

  if (error) {
    console.error("[cron appointment-reminders]", error);
    return NextResponse.json({ error: "فشل الجلب" }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;

  for (const raw of rows ?? []) {
    const apt = raw as {
      id: string;
      appointmentDate: string;
      startTime: string;
      patient?: { phone?: string | null } | { phone?: string | null }[] | null;
      doctor?: { user?: { name?: string | null } } | { user?: { name?: string | null } }[] | null;
      clinic?: { name?: string | null } | { name?: string | null }[] | null;
    };
    const ad = new Date(apt.appointmentDate);
    if (ymdInJerusalem(ad) !== targetYmd) {
      skipped++;
      continue;
    }

    const patient = Array.isArray(apt.patient) ? apt.patient[0] : apt.patient;
    const doctorRel = Array.isArray(apt.doctor) ? apt.doctor[0] : apt.doctor;
    const clinicRel = Array.isArray(apt.clinic) ? apt.clinic[0] : apt.clinic;
    const phone = patient?.phone?.trim();
    if (!phone) {
      skipped++;
      continue;
    }

    const doctorName = doctorRel?.user?.name ?? "الطبيب";
    const dateStr = formatDateNumeric(
      typeof apt.appointmentDate === "string" ? apt.appointmentDate : ad.toISOString(),
    );
    const timeStr = String(apt.startTime ?? "").slice(0, 5);
    const msg = buildAppointmentReminderSmsMessage({
      doctorName,
      dateStr,
      timeStr,
      clinicName: clinicRel?.name ?? null,
    });

    const delivery = await sendSmsAndWhatsAppToSameNumber(phone, msg);
    if (deliveryAnyChannelSucceeded(delivery)) {
      await supabaseAdmin
        .from("Appointment")
        .update({
          appointmentReminderSentAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .eq("id", apt.id);
      sent++;
    }
  }

  return NextResponse.json({ ok: true, targetYmd, sent, skipped, scanned: (rows ?? []).length });
}
