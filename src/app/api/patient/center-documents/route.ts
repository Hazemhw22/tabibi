import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

/** نتائج تحاليل/أشعة أرفقها المركز — تظهر للمريض */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (session.user.role !== "PATIENT") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("MedicalCenterPatientDocument")
      .select("id, category, title, fileUrl, fileName, mimeType, notes, createdAt, medicalCenterId")
      .eq("patientUserId", session.user.id)
      .order("createdAt", { ascending: false })
      .limit(100);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "تعذر التحميل" }, { status: 500 });
    }

    return NextResponse.json({ documents: data ?? [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
