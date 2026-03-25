import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { assertMedicalCenterApproved } from "@/lib/medical-center-auth";

/** طلبات الربط المعلّقة (لعرضها في لوحة المركز) */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const gate = await assertMedicalCenterApproved(session.user.id);
    if (!gate.ok) return gate.response;
    const centerId = gate.centerId;

    const { data: rows, error } = await supabaseAdmin
      .from("MedicalCenterDoctorInvite")
      .select("id, createdAt, doctorId")
      .eq("medicalCenterId", centerId)
      .eq("status", "PENDING")
      .order("createdAt", { ascending: false });

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "تعذر التحميل" }, { status: 500 });
    }

    const doctorIds = [...new Set((rows ?? []).map((r: { doctorId: string }) => r.doctorId))];
    const docMap = new Map<string, { name: string; specialtyAr: string }>();
    if (doctorIds.length > 0) {
      const { data: doctors } = await supabaseAdmin
        .from("Doctor")
        .select("id, user:User(name), specialty:Specialty(nameAr)")
        .in("id", doctorIds);
      for (const d of doctors ?? []) {
        const row = d as {
          id: string;
          user?: { name?: string } | { name?: string }[];
          specialty?: { nameAr?: string } | { nameAr?: string }[];
        };
        const u = Array.isArray(row.user) ? row.user[0] : row.user;
        const sp = Array.isArray(row.specialty) ? row.specialty[0] : row.specialty;
        docMap.set(row.id, { name: u?.name ?? "", specialtyAr: sp?.nameAr ?? "" });
      }
    }

    const invites = (rows ?? []).map((r: { id: string; createdAt: string; doctorId: string }) => {
      const meta = docMap.get(r.doctorId);
      return {
        id: r.id,
        createdAt: r.createdAt,
        doctorName: meta?.name ?? "",
        specialtyAr: meta?.specialtyAr ?? "",
      };
    });

    return NextResponse.json({ invites });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
