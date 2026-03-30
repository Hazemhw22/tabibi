import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  sendSmsAndWhatsAppToSameNumber,
  deliveryAnyChannelSucceeded,
} from "@/lib/sms";
import { randomUUID } from "crypto";

const schema = z.object({
  body: z.string().min(1).max(1000),
});

/** إرسال رسالة واحدة لكل المستخدمين الذين لديهم رقم هاتف (مشرف المنصة فقط). */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (session.user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const json = await req.json();
    const data = schema.parse(json);

    const { data: users, error } = await supabaseAdmin
      .from("User")
      .select("id, name, phone")
      .not("phone", "is", null)
      .limit(5000);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "تعذر جلب المستخدمين", details: error }, { status: 500 });
    }

    const recipients = (users ?? []).filter((u) => Boolean(u.phone));
    const phones = recipients.map((u) => String(u.phone));

    let sent = 0;
    let failed = 0;
    let smsSent = 0;
    let whatsappSent = 0;
    let whatsappAttempted = 0;

    // Concurrency = 3
    const batchSize = 3;
    for (let i = 0; i < phones.length; i += batchSize) {
      const batch = phones.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (phone) => {
          const id = randomUUID();
          const insertRow: Record<string, unknown> = {
            id,
            createdByUserId: session.user.id,
            createdByRole: "PLATFORM_ADMIN",
            medicalCenterId: null,
            doctorId: null,
            provider: "ASTRA",
            channel: "SMS",
            to: phone,
            body: data.body,
            status: "PENDING",
            providerResponse: null,
          };

          const { error: insErr } = await supabaseAdmin.from("MessageLog").insert(insertRow);
          if (insErr) {
            console.error(insErr);
            throw new Error(`log_insert_failed:${insErr.message}`);
          }

          const r = await sendSmsAndWhatsAppToSameNumber(phone, data.body);
          const ok = deliveryAnyChannelSucceeded(r);
          const parts = [`sms:${r.sms ? "ok" : "fail"}`];
          if (r.whatsapp !== null) parts.push(`whatsapp:${r.whatsapp ? "ok" : "fail"}`);
          const providerResponse = parts.join(";");
          const status = ok ? "SENT" : "FAILED";
          const provider = r.whatsapp !== null ? "ASTRA+TWILIO_WA" : "ASTRA";
          const channel = r.whatsapp !== null ? "SMS+WHATSAPP" : "SMS";

          await supabaseAdmin
            .from("MessageLog")
            .update({
              status,
              provider,
              channel,
              providerResponse,
              updatedAt: new Date().toISOString(),
            })
            .eq("id", id);

          return { ok, sms: r.sms, whatsapp: r.whatsapp };
        })
      );

      for (const r of results) {
        if (r.status !== "fulfilled") {
          failed += 1;
          continue;
        }
        sent += r.value.ok ? 1 : 0;
        failed += r.value.ok ? 0 : 1;
        if (r.value.sms) smsSent += 1;
        if (r.value.whatsapp !== null) {
          whatsappAttempted += 1;
          if (r.value.whatsapp) whatsappSent += 1;
        }
      }
    }

    return NextResponse.json(
      {
        total: phones.length,
        sent,
        failed,
        smsSent,
        whatsappSent,
        whatsappAttempted,
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة", details: e.issues }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json(
      {
        error: "خطأ في الخادم",
        details: e instanceof Error ? { message: e.message, name: e.name } : { message: String(e) },
      },
      { status: 500 }
    );
  }
}

