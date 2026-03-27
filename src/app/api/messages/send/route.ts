import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendSms } from "@/lib/sms";
import { getMedicalCenterIdForUser } from "@/lib/medical-center-auth";

const schema = z.object({
  to: z.string().min(6),
  body: z.string().min(1).max(1000),
});

/**
 * إرسال رسالة SMS مع تسجيلها في MessageLog.
 * - PLATFORM_ADMIN: يمكنه الإرسال لأي رقم.
 * - MEDICAL_CENTER_*: يسجل medicalCenterId تلقائياً.
 * - DOCTOR: يسجل doctorId (من جدول Doctor) إن وُجد.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const json = await req.json();
    const data = schema.parse(json);

    const role = session.user.role ?? "PATIENT";
    if (role !== "PLATFORM_ADMIN" && role !== "DOCTOR" && !String(role).startsWith("MEDICAL_CENTER_")) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const centerId = String(role).startsWith("MEDICAL_CENTER_")
      ? await getMedicalCenterIdForUser(session.user.id)
      : null;

    let doctorId: string | null = null;
    if (role === "DOCTOR") {
      const { data: doc } = await supabaseAdmin.from("Doctor").select("id").eq("userId", session.user.id).maybeSingle();
      doctorId = (doc as { id?: string } | null)?.id ?? null;
    }

    // Insert pending log first
    const insertRow: Record<string, unknown> = {
      createdByUserId: session.user.id,
      createdByRole: role,
      medicalCenterId: centerId,
      doctorId,
      provider: "ASTRA",
      channel: "SMS",
      to: data.to,
      body: data.body,
      status: "PENDING",
      providerResponse: null,
    };

    const { data: row, error: insErr } = await supabaseAdmin
      .from("MessageLog")
      .insert(insertRow)
      .select("id")
      .single();

    if (insErr || !row?.id) {
      console.error(insErr);
      return NextResponse.json(
        {
          error: "فشل تسجيل الرسالة",
          details: (insErr as { message?: string; details?: string; hint?: string; code?: string } | null) ?? null,
        },
        { status: 500 }
      );
    }

    const ok = await sendSms(data.to, data.body);

    const status = ok ? "SENT" : "FAILED";
    const providerResponse = ok ? "OK" : "FAILED";
    await supabaseAdmin
      .from("MessageLog")
      .update({ status, providerResponse, updatedAt: new Date().toISOString() })
      .eq("id", row.id);

    return NextResponse.json({ id: row.id, status }, { status: ok ? 201 : 502 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة", details: e.issues }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json(
      {
        error: "خطأ في الخادم",
        details:
          e instanceof Error
            ? { message: e.message, name: e.name }
            : { message: String(e) },
      },
      { status: 500 }
    );
  }
}

