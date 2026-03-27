import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getMedicalCenterIdForUser } from "@/lib/medical-center-auth";

/** سجل الرسائل حسب الدور */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const role = session.user.role ?? "PATIENT";
    if (role !== "PLATFORM_ADMIN" && role !== "DOCTOR" && !String(role).startsWith("MEDICAL_CENTER_")) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    let q = supabaseAdmin
      .from("MessageLog")
      .select("id, createdAt, createdByRole, to, body, status, provider, channel, medicalCenterId, doctorId")
      .order("createdAt", { ascending: false })
      .limit(300);

    if (role === "PLATFORM_ADMIN") {
      // all
    } else if (String(role).startsWith("MEDICAL_CENTER_")) {
      const centerId = await getMedicalCenterIdForUser(session.user.id);
      if (!centerId) return NextResponse.json({ messages: [] });
      q = q.eq("medicalCenterId", centerId);
    } else {
      // DOCTOR: only own messages
      q = q.eq("createdByUserId", session.user.id);
    }

    const { data, error } = await q;
    if (error) {
      console.error(error);
      return NextResponse.json({ error: "تعذر التحميل" }, { status: 500 });
    }
    return NextResponse.json({ messages: data ?? [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

