import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendSms } from "@/lib/sms";
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

          const ok = await sendSms(phone, data.body);
          const status = ok ? "SENT" : "FAILED";
          const providerResponse = ok ? "OK" : "FAILED";

          await supabaseAdmin
            .from("MessageLog")
            .update({ status, providerResponse, updatedAt: new Date().toISOString() })
            .eq("id", id);

          return ok;
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled" && r.value === true) sent += 1;
        else failed += 1;
      }
    }

    return NextResponse.json({ total: phones.length, sent, failed }, { status: 201 });
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

