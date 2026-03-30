import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { data: users, error: usersErr } = await supabaseAdmin
      .from("User")
      .select("id, phone")
      .eq("role", "DOCTOR")
      .limit(5000);
    if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 500 });

    const { data: doctors, error: doctorsErr } = await supabaseAdmin.from("Doctor").select("userId").limit(5000);
    if (doctorsErr) return NextResponse.json({ error: doctorsErr.message }, { status: 500 });

    const doctorUserIds = new Set((doctors ?? []).map((d) => (d as { userId: string }).userId));
    const missing = (users ?? []).filter((u) => !doctorUserIds.has((u as { id: string }).id));

    if (missing.length === 0) {
      return NextResponse.json({ inserted: 0, totalDoctorUsers: (users ?? []).length });
    }

    const { data: firstSpec, error: specErr } = await supabaseAdmin
      .from("Specialty")
      .select("id")
      .order("createdAt", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (specErr) return NextResponse.json({ error: specErr.message }, { status: 500 });
    const specialtyId = (firstSpec as { id?: string } | null)?.id;
    if (!specialtyId) {
      return NextResponse.json({ error: "لا يوجد تخصصات في النظام لإنشاء ملفات أطباء." }, { status: 500 });
    }

    const rows = missing.map((u) => {
      const userId = (u as { id: string }).id;
      const phone = (u as { phone?: string | null }).phone ?? "";
      const digits = phone.replace(/\D/g, "").slice(-9);
      const whatsapp = digits ? `972${digits}` : null;
      return {
        userId,
        specialtyId,
        whatsapp,
        status: "PENDING",
        experienceYears: 0,
        consultationFee: 0,
        rating: 0,
        totalReviews: 0,
      };
    });

    const { error: insErr } = await supabaseAdmin.from("Doctor").insert(rows);
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    return NextResponse.json({
      inserted: rows.length,
      totalDoctorUsers: (users ?? []).length,
    });
  } catch (e) {
    console.error("[admin/sync-doctors] POST", e);
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
  }
}

