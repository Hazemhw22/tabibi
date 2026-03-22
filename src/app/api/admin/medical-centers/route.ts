import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

/** قائمة المراكز الطبية لمشرف المنصة */
export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { data: centers, error } = await supabaseAdmin
      .from("MedicalCenter")
      .select(
        "id, name, nameAr, slug, city, phone, address, isActive, approvalStatus, subscriptionEndDate, createdAt"
      )
      .order("createdAt", { ascending: false });

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "تعذر التحميل" }, { status: 500 });
    }

    const { data: doctorCounts } = await supabaseAdmin.from("Doctor").select("medicalCenterId");
    const countByCenter = (doctorCounts ?? []).reduce<Record<string, number>>((acc, row) => {
      const mid = (row as { medicalCenterId?: string | null }).medicalCenterId;
      if (mid) acc[mid] = (acc[mid] ?? 0) + 1;
      return acc;
    }, {});

    const rows = (centers ?? []).map((c) => ({
      ...(c as object),
      doctorsCount: countByCenter[(c as { id: string }).id] ?? 0,
    }));

    return NextResponse.json({ centers: rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
